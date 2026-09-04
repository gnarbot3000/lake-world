(function () {
  "use strict";

  var clubsLoaded = false;

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

  function showJoinError(msg) {
    var el = $("join-error");
    if (!el) return;
    el.textContent = msg || "";
    el.hidden = !msg;
  }

  function fillClubs() {
    var sel = $("join-club");
    if (!sel || clubsLoaded) return;
    var sb = window.LAKE_SB;
    if (!sb || !window.LakeClub || typeof window.LakeClub.listClubs !== "function") return;
    window.LakeClub.listClubs(sb).then(function (res) {
      if (!res || res.ok === false) {
        showJoinError((res && res.error) || "Could not load clubs.");
        return;
      }
      var clubs = res.clubs || [];
      sel.innerHTML = "";
      var i;
      for (i = 0; i < clubs.length; i++) {
        var opt = document.createElement("option");
        opt.value = clubs[i].id;
        opt.textContent = clubs[i].name;
        sel.appendChild(opt);
      }
      clubsLoaded = true;
      if (!clubs.length) showJoinError("No clubs to join yet.");
    }).catch(function (err) {
      showJoinError((err && err.message) || "Could not load clubs.");
    });
  }

  function paintGates() {
    var c = club();
    var signedIn = !!(window.LAKE_USER_ID);
    var pending = $("pending-gate");
    var joinGate = $("join-gate");
    var inviteOnly = $("invite-only-note");
    var denied = $("denied-gate");
    var note = $("club-signin-note");
    if (pending) pending.hidden = !(signedIn && c.status === "pending");
    if (denied) denied.hidden = !(signedIn && c.status === "denied");
    if (joinGate) {
      joinGate.hidden = !(signedIn && c.status === "none");
      if (!joinGate.hidden) fillClubs();
    }
    if (inviteOnly) inviteOnly.hidden = true;
    if (note) note.hidden = signedIn || c.status === "approved";
    var adminLink = $("mast-admin-link");
    if (adminLink) adminLink.hidden = !(c.status === "approved");
    var pendingCopy = pending && pending.querySelector(".legend");
    if (pendingCopy && c.clubName) {
      pendingCopy.textContent = "You are signed in. An admin of " + c.clubName +
        " still has to approve you before you can see the club roster.";
    }
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

  function paintClubSwitch() {
    var sel = $("club-select");
    if (!sel) return;
    var c = club();
    var clubs = c.myClubs || [];
    if (clubs.length < 2) {
      sel.hidden = true;
      return;
    }
    var html = "";
    var i;
    for (i = 0; i < clubs.length; i++) {
      var row = clubs[i];
      html += '<option value="' + escapeHtml(row.id) + '"';
      if (row.id === c.clubId) html += " selected";
      html += ">" + escapeHtml(row.name || "Club") + "</option>";
    }
    sel.innerHTML = html;
    sel.hidden = false;
  }

  function bind() {
    var joinForm = $("join-club-form");
    if (joinForm && !joinForm.getAttribute("data-bound")) {
      joinForm.setAttribute("data-bound", "1");
      joinForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var sb = window.LAKE_SB;
        if (!sb || !window.LakeClub) return;
        var nameEl = $("join-name");
        var clubEl = $("join-club");
        var name = nameEl ? nameEl.value : "";
        var clubId = clubEl ? clubEl.value : "";
        showJoinError("");
        if (!clubId) {
          showJoinError("Pick a club.");
          return;
        }
        window.LakeClub.requestJoin(sb, clubId, name).then(function (res) {
          if (!res || res.ok === false) {
            showJoinError((res && res.error) || "Could not request to join.");
            return;
          }
          if (res.club_id && window.LakeClub.selectClub) {
            return window.LakeClub.selectClub(sb, res.club_id).then(function (next) {
              window.LAKE_CLUB = next;
              paint();
            });
          }
          return window.LakeClub.refresh(sb).then(function (next) {
            window.LAKE_CLUB = next;
            paint();
          });
        }).catch(function (err) {
          showJoinError((err && err.message) || "Could not request to join.");
        });
      });
    }

    var juniorForm = $("add-junior-form");
    if (juniorForm && !juniorForm.getAttribute("data-bound")) {
      juniorForm.setAttribute("data-bound", "1");
      juniorForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var sb = window.LAKE_SB;
        if (!sb || !window.LakeClub) return;
        var nameEl = $("junior-name");
        var name = nameEl ? nameEl.value : "";
        window.LakeClub.addJunior(sb, name).then(function (res) {
          if (!res || res.ok === false) {
            toast((res && res.error) || "Could not add the junior.");
            return;
          }
          if (nameEl) nameEl.value = "";
          toast("Junior added — waiting for admin approval.");
          return window.LakeClub.refresh(sb).then(function (next) {
            window.LAKE_CLUB = next;
            paint();
          });
        }).catch(function (err) {
          toast((err && err.message) || "Could not add the junior.");
        });
      });
    }

    var clubSel = $("club-select");
    if (clubSel && !clubSel.getAttribute("data-bound")) {
      clubSel.setAttribute("data-bound", "1");
      clubSel.addEventListener("change", function () {
        var sb = window.LAKE_SB;
        if (!sb || !window.LakeClub || !clubSel.value) return;
        window.LakeClub.selectClub(sb, clubSel.value).then(function (next) {
          window.LAKE_CLUB = next;
          paint();
          location.reload();
        }).catch(function () {
          location.reload();
        });
      });
    }
  }

  function paint() {
    paintGates();
    paintClubTools();
    paintRosterNames();
    paintClubSwitch();
  }

  bind();
  paint();
  window.LakeClubUi = { paint: paint };
})();
