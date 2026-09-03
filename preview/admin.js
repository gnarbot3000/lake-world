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

  function paintClubSwitch() {
    var sel = $("club-select");
    if (!sel) return;
    var clubs = (state && state.myClubs) || [];
    if (clubs.length < 2) {
      sel.hidden = true;
      return;
    }
    var html = "";
    var i;
    for (i = 0; i < clubs.length; i++) {
      var row = clubs[i];
      html += '<option value="' + escapeHtml(row.id) + '"';
      if (state && row.id === state.clubId) html += " selected";
      html += ">" + escapeHtml(row.name || "Club") + "</option>";
    }
    sel.innerHTML = html;
    sel.hidden = false;
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
      paintClubSwitch();
      return;
    }

    if (state.status === "pending") {
      if (gate) {
        gate.hidden = false;
        var copy = $("admin-gate-copy");
        if (copy) copy.textContent = "You're signed in and waiting for an admin to approve you. You cannot see the club yet.";
      }
      if (app) app.hidden = true;
      paintClubSwitch();
      return;
    }

    if (state.status === "denied") {
      if (gate) {
        gate.hidden = false;
        var copyD = $("admin-gate-copy");
        if (copyD) copyD.textContent = "This club did not approve you.";
      }
      if (app) app.hidden = true;
      paintClubSwitch();
      return;
    }

    if (state.status !== "approved") {
      if (gate) {
        gate.hidden = false;
        var copyN = $("admin-gate-copy");
        if (copyN) copyN.textContent = "Pick a club on the Mini and request to join. An admin still has to approve you.";
      }
      if (app) app.hidden = true;
      paintClubSwitch();
      return;
    }

    if (gate) gate.hidden = true;
    if (app) app.hidden = false;
    var title = $("admin-club-title");
    if (title && state.clubName) title.textContent = state.clubName;
    var foot = document.querySelector("footer p");
    if (foot && state.clubName) foot.textContent = "lake.world · " + state.clubName;
    if (role) {
      role.textContent = state.isAdmin
        ? "You are an admin. Approve pending people and add other admins here."
        : "Only admins can approve people and add other admins.";
    }
    paintPending();
    paintMembers();
    paintAdmins();
    paintClubSwitch();
  }

  var app = $("admin-app");
  if (app) {
    app.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn || !sb) return;
      var act = btn.getAttribute("data-act");
      if (!act) return;
      showError("");
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

  var clubSel = $("club-select");
  if (clubSel) {
    clubSel.addEventListener("change", function () {
      if (!sb || !window.LakeClub || !clubSel.value) return;
      window.LakeClub.selectClub(sb, clubSel.value).then(function (next) {
        state = next;
        window.LAKE_CLUB = next;
        paint();
        location.reload();
      }).catch(function () {
        location.reload();
      });
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
