(function () {
  "use strict";

  var sb = null;
  var state = null;

  function $(id) {
    return document.getElementById(id);
  }

  function showError(msg) {
    var el = $("admin-error");
    if (!el) return;
    el.textContent = msg || "";
    el.hidden = !msg;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function paintAuth(email) {
    var wrap = $("mast-auth");
    var el = $("mast-user-email");
    if (el) el.textContent = email || "";
    if (wrap) wrap.hidden = !email;
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
        field.hidden = false;
        field.select();
        document.execCommand("copy");
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  function kindOf(row) {
    return row && row.is_junior ? "junior" : "adult";
  }

  function refreshThen(done) {
    window.LakeClub.refresh(sb).then(function (next) {
      state = next;
      paint();
      if (done) done();
    }).catch(function (err) {
      showError((err && err.message) || "Could not refresh.");
      if (done) done();
    });
  }

  function paintInvites() {
    var list = $("open-invites-list");
    var empty = $("open-invites-empty");
    if (!list) return;
    var invites = (state && state.invites) || [];
    if (!invites.length) {
      list.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    var html = "";
    var i;
    for (i = 0; i < invites.length; i++) {
      var inv = invites[i];
      var url = window.LakeClub.inviteUrl(inv.token);
      html += '<li class="admin-row">';
      html += '<div class="admin-row-main"><strong>' + escapeHtml(inv.display_name) + "</strong>";
      html += '<span class="admin-meta">' + kindOf(inv) + "</span></div>";
      html += '<button type="button" class="btn-ghost" data-act="copy-open" data-token="' +
        escapeHtml(inv.token) + '">Copy link</button>';
      html += '<input class="sr-only" value="' + escapeHtml(url) + '" readonly>';
      html += "</li>";
    }
    list.innerHTML = html;
  }

  function paintPending() {
    var section = $("pending-section");
    var list = $("pending-list");
    var empty = $("pending-empty");
    if (!section || !list) return;
    var isAdmin = !!(state && state.isAdmin);
    section.hidden = !isAdmin;
    if (!isAdmin) return;
    var pending = state.pending || [];
    if (!pending.length) {
      list.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    var html = "";
    var i;
    for (i = 0; i < pending.length; i++) {
      var m = pending[i];
      var extra = m.is_junior
        ? "junior" + (m.parent_name ? " · parent " + m.parent_name : "")
        : "adult";
      html += '<li class="admin-row">';
      html += '<div class="admin-row-main"><strong>' + escapeHtml(m.display_name) + "</strong>";
      html += '<span class="admin-meta">' + escapeHtml(extra) + "</span></div>";
      html += '<button type="button" class="btn-primary" data-act="approve" data-id="' +
        escapeHtml(m.id) + '">Approve</button>';
      html += '<button type="button" class="btn-ghost" data-act="deny" data-id="' +
        escapeHtml(m.id) + '">Deny</button>';
      html += "</li>";
    }
    list.innerHTML = html;
  }

  function adminUserIds() {
    var set = {};
    var admins = (state && state.admins) || [];
    var i;
    for (i = 0; i < admins.length; i++) {
      if (admins[i] && admins[i].user_id) set[admins[i].user_id] = true;
    }
    return set;
  }

  function paintMembers() {
    var list = $("members-list");
    var empty = $("members-empty");
    if (!list) return;
    var members = (state && state.members) || [];
    if (!members.length) {
      list.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    var isAdmin = !!(state && state.isAdmin);
    var adminIds = adminUserIds();
    var html = "";
    var i;
    for (i = 0; i < members.length; i++) {
      var m = members[i];
      var meta = m.is_junior ? "junior" : "adult";
      if (m.user_id && adminIds[m.user_id]) meta += " · admin";
      html += '<li class="admin-row">';
      html += '<div class="admin-row-main"><strong>' + escapeHtml(m.display_name) + "</strong>";
      html += '<span class="admin-meta">' + escapeHtml(meta) + "</span></div>";
      if (isAdmin && !m.is_junior && m.user_id && !adminIds[m.user_id]) {
        html += '<button type="button" class="btn-ghost" data-act="make-admin" data-user="' +
          escapeHtml(m.user_id) + '">Make admin</button>';
      }
      html += "</li>";
    }
    list.innerHTML = html;
  }

  function paintAdmins() {
    var section = $("admins-section");
    var list = $("admins-list");
    if (!section || !list) return;
    var isAdmin = !!(state && state.isAdmin);
    section.hidden = !isAdmin;
    if (!isAdmin) return;
    var admins = state.admins || [];
    var html = "";
    var i;
    for (i = 0; i < admins.length; i++) {
      var a = admins[i];
      html += '<li class="admin-row">';
      html += '<div class="admin-row-main"><strong>' + escapeHtml(a.display_name || "Admin") + "</strong></div>";
      html += '<button type="button" class="btn-ghost" data-act="remove-admin" data-user="' +
        escapeHtml(a.user_id) + '">Remove admin</button>';
      html += "</li>";
    }
    list.innerHTML = html;
  }

  function paint() {
    var gate = $("admin-gate");
    var app = $("admin-app");
    var role = $("admin-role");
    var email = window.LAKE_USER_EMAIL || "";
    paintAuth(email);

    if (!state || state.status === "guest" || !window.LAKE_USER_ID) {
      if (gate) gate.hidden = false;
      if (app) app.hidden = true;
      return;
    }

    if (state.status === "pending") {
      if (gate) {
        gate.hidden = false;
        var copy = $("admin-gate-copy");
        if (copy) copy.textContent = "You're signed in and waiting for an admin to approve you. You cannot see the club yet.";
      }
      if (app) app.hidden = true;
      return;
    }

    if (state.status === "denied") {
      if (gate) {
        gate.hidden = false;
        var copyD = $("admin-gate-copy");
        if (copyD) copyD.textContent = "This invite was not approved. Ask a member for a new link.";
      }
      if (app) app.hidden = true;
      return;
    }

    if (state.status !== "approved") {
      if (gate) {
        gate.hidden = false;
        var copyN = $("admin-gate-copy");
        if (copyN) copyN.textContent = "Ski Paradise Cleveland is invite-only. Ask a member for a link.";
      }
      if (app) app.hidden = true;
      return;
    }

    if (gate) gate.hidden = true;
    if (app) app.hidden = false;
    if (role) {
      role.textContent = state.isAdmin
        ? "You are an admin. Approve pending people and add other admins here. Any member can create a named invite."
        : "Any member can create a named invite. Only admins can approve people.";
    }
    paintInvites();
    paintPending();
    paintMembers();
    paintAdmins();
  }

  function selectedJunior() {
    var radios = document.querySelectorAll('input[name="invite-kind"]');
    var i;
    for (i = 0; i < radios.length; i++) {
      if (radios[i].checked) return radios[i].value === "junior";
    }
    return false;
  }

  function showCreatedLink(token) {
    var row = $("invite-link-row");
    var field = $("invite-link-field");
    if (!row || !field) return;
    field.value = window.LakeClub.inviteUrl(token);
    row.hidden = false;
    field.focus();
    field.select();
  }

  var form = $("create-invite-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!sb || !state || state.status !== "approved") return;
      var nameEl = $("invite-name");
      var name = nameEl ? nameEl.value : "";
      showError("");
      window.LakeClub.createInvite(sb, name, selectedJunior()).then(function (res) {
        if (!res || res.ok === false) {
          showError((res && res.error) || "Could not create the invite.");
          return;
        }
        if (nameEl) nameEl.value = "";
        showCreatedLink(res.token);
        refreshThen();
      }).catch(function (err) {
        showError((err && err.message) || "Could not create the invite.");
      });
    });
  }

  var copyBtn = $("copy-invite-btn");
  if (copyBtn) {
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

  var app = $("admin-app");
  if (app) {
    app.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn || !sb) return;
      var act = btn.getAttribute("data-act");
      if (!act) return;
      showError("");
      if (act === "copy-open") {
        var url = window.LakeClub.inviteUrl(btn.getAttribute("data-token"));
        copyText(url).then(function () {
          btn.textContent = "Copied";
          setTimeout(function () { btn.textContent = "Copy link"; }, 1600);
        }).catch(function () {});
        return;
      }
      if (act === "approve" || act === "deny") {
        var status = act === "approve" ? "approved" : "denied";
        window.LakeClub.setMemberStatus(sb, btn.getAttribute("data-id"), status).then(function (res) {
          if (!res || res.ok === false) {
            showError((res && res.error) || "Could not update that person.");
            return;
          }
          refreshThen();
        });
        return;
      }
      if (act === "make-admin") {
        window.LakeClub.addAdmin(sb, btn.getAttribute("data-user")).then(function (res) {
          if (!res || res.ok === false) {
            showError((res && res.error) || "Could not add admin.");
            return;
          }
          refreshThen();
        });
        return;
      }
      if (act === "remove-admin") {
        window.LakeClub.removeAdmin(sb, btn.getAttribute("data-user")).then(function (res) {
          if (!res || res.ok === false) {
            showError((res && res.error) || "Could not remove admin.");
            return;
          }
          refreshThen();
        });
      }
    });
  }

  var signout = $("signout-btn");
  if (signout) {
    signout.addEventListener("click", function () {
      var go = function () { location.href = "../index.html"; };
      if (!sb || !sb.auth) { go(); return; }
      sb.auth.signOut().then(go).catch(go);
    });
  }

  window.LAKE_USER_ID = "";
  window.LAKE_USER_EMAIL = "";
  window.LAKE_CLUB = window.LakeClub.emptyState("guest");

  if (!window.supabase || !window.LAKE_SUPABASE_URL || !window.LAKE_SUPABASE_ANON || !window.LakeClub) {
    state = window.LAKE_CLUB;
    paint();
    return;
  }

  try {
    sb = window.supabase.createClient(window.LAKE_SUPABASE_URL, window.LAKE_SUPABASE_ANON);
  } catch (err) {
    sb = null;
  }

  if (!sb) {
    state = window.LAKE_CLUB;
    paint();
    return;
  }

  sb.auth.getSession().then(function (result) {
    var session = result && result.data && result.data.session;
    var user = session && session.user;
    if (user) {
      window.LAKE_USER_ID = user.id || "";
      window.LAKE_USER_EMAIL = user.email || "";
    }
    return window.LakeClub.boot(sb, user);
  }).then(function (next) {
    state = next;
    window.LAKE_CLUB = next;
    if (next && next.ok === false && next.error) showError(next.error);
    paint();
  }).catch(function () {
    state = window.LakeClub.emptyState("none");
    paint();
  });
})();
