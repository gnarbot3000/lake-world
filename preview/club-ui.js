(function () {
  "use strict";

  function $(id) {
    return document.getElementById(id);
  }

  function club() {
    return window.LAKE_CLUB || { status: "guest", members: [], juniors: [], invites: [] };
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function nameSortKey(name) {
    var parts = String(name || "").replace(/\s+/g, " ").trim().split(" ");
    if (!parts[0]) return { last: "", first: "" };
    if (parts.length === 1) return { last: parts[0].toLowerCase(), first: "" };
    return {
      last: parts[parts.length - 1].toLowerCase(),
      first: parts.slice(0, -1).join(" ").toLowerCase()
    };
  }

  function toast(text) {
    var el = $("app-toast");
    if (!el || !text) return;
    el.textContent = text;
    el.classList.add("is-on");
    setTimeout(function () { el.classList.remove("is-on"); }, 2400);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var field = $("invite-link-field");
        if (!field) throw new Error("no field");
        field.value = text;
        field.select();
        document.execCommand("copy");
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  function paintGates() {
    var c = club();
    var signedIn = !!(window.LAKE_USER_ID);
    var pending = $("pending-gate");
    var inviteOnly = $("invite-only-note");
    var denied = $("denied-gate");
    var note = $("club-signin-note");
    if (pending) pending.hidden = !(signedIn && c.status === "pending");
    if (denied) denied.hidden = !(signedIn && c.status === "denied");
    if (inviteOnly) inviteOnly.hidden = !(signedIn && c.status === "none");
    if (note) note.hidden = signedIn || c.status === "approved";
    var adminLink = $("mast-admin-link");
    if (adminLink) adminLink.hidden = !(c.status === "approved");
    var consumeErr = $("consume-error");
    if (consumeErr) {
      if (c.consumeError) {
        consumeErr.hidden = false;
        consumeErr.textContent = c.consumeError;
      } else {
        consumeErr.hidden = true;
      }
    }
  }

  function paintRosterNames() {
    var block = $("club-roster-block");
    var list = $("club-roster-list");
    var c = club();
    if (!block || !list) return;
    if (c.status !== "approved") {
      block.hidden = true;
      list.innerHTML = "";
      return;
    }
    var members = (c.members || []).slice();
    members.sort(function (a, b) {
      var ka = nameSortKey(a.display_name);
      var kb = nameSortKey(b.display_name);
      if (ka.last < kb.last) return -1;
      if (ka.last > kb.last) return 1;
      if (ka.first < kb.first) return -1;
      if (ka.first > kb.first) return 1;
      return 0;
    });
    block.hidden = false;
    var html = "";
    var i;
    for (i = 0; i < members.length; i++) {
      var m = members[i];
      html += '<li class="roster-name">' + escapeHtml(m.display_name || "");
      if (m.is_junior) html += ' <span class="admin-meta">junior</span>';
      html += "</li>";
    }
    list.innerHTML = html;
  }

  function paintClubTools() {
    var tools = $("club-tools");
    var c = club();
    if (!tools) return;
    tools.hidden = c.status !== "approved";
    var pendingWrap = $("pending-juniors");
    if (pendingWrap) {
      var juniors = (c.juniors || []).filter(function (j) { return j.status === "pending"; });
      if (!juniors.length) {
        pendingWrap.hidden = true;
        pendingWrap.innerHTML = "";
      } else {
        pendingWrap.hidden = false;
        var html = "";
        var i;
        for (i = 0; i < juniors.length; i++) {
          html += "<p>" + escapeHtml(juniors[i].display_name) + " (junior) — waiting for admin approval.</p>";
        }
        pendingWrap.innerHTML = html;
      }
    }
  }

  function selectedJunior() {
    var radios = document.querySelectorAll("#create-invite-form input[name='invite-kind']");
    var i;
    for (i = 0; i < radios.length; i++) {
      if (radios[i].checked) return radios[i].value === "junior";
    }
    return false;
  }

  function showCreatedLink(token) {
    var row = $("invite-link-row");
    var field = $("invite-link-field");
    if (!row || !field || !window.LakeClub) return;
    field.value = window.LakeClub.inviteUrl(token);
    row.hidden = false;
    field.focus();
    field.select();
  }

  function bind() {
    var form = $("create-invite-form");
    if (form && !form.getAttribute("data-bound")) {
      form.setAttribute("data-bound", "1");
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var sb = window.LAKE_SB;
        if (!sb || !window.LakeClub) return;
        var nameEl = $("invite-name");
        var name = nameEl ? nameEl.value : "";
        window.LakeClub.createInvite(sb, name, selectedJunior()).then(function (res) {
          if (!res || res.ok === false) {
            toast((res && res.error) || "Could not create the invite.");
            return;
          }
          if (nameEl) nameEl.value = "";
          showCreatedLink(res.token);
          toast("Invite link ready — copy it and send it yourself.");
          return window.LakeClub.refresh(sb).then(function (next) {
            window.LAKE_CLUB = next;
            paint();
          });
        }).catch(function (err) {
          toast((err && err.message) || "Could not create the invite.");
        });
      });
    }

    var copyBtn = $("copy-invite-btn");
    if (copyBtn && !copyBtn.getAttribute("data-bound")) {
      copyBtn.setAttribute("data-bound", "1");
      copyBtn.addEventListener("click", function () {
        var field = $("invite-link-field");
        if (!field || !field.value) return;
        copyText(field.value).then(function () {
          copyBtn.textContent = "Copied";
          setTimeout(function () { copyBtn.textContent = "Copy link"; }, 1600);
        }).catch(function () {
          field.select();
        });
      });
    }
  }

  function paint() {
    paintGates();
    paintClubTools();
    paintRosterNames();
  }

  bind();
  paint();
  window.LakeClubUi = { paint: paint };
})();
