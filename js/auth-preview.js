(function () {
  "use strict";

  function paintAuth(email) {
    var wrap = document.getElementById("mast-auth");
    var el = document.getElementById("mast-user-email");
    if (el) el.textContent = email || "";
    if (wrap) wrap.hidden = !email;
  }

  function loadScript(src, done) {
    var s = document.createElement("script");
    s.src = src;
    s.async = false;
    if (done) {
      s.onload = done;
      s.onerror = done;
    }
    document.body.appendChild(s);
  }

  function loadApp() {
    loadScript("photos.js", function () {
      loadScript("app.js", function () {
        loadScript("club-ui.js");
      });
    });
  }

  function guestClub() {
    return window.LakeClub
      ? window.LakeClub.emptyState("guest")
      : { status: "guest", isAdmin: false, members: [], me: null, juniors: [], pending: [], invites: [], admins: [] };
  }

  function bindSignOut(sb) {
    var btn = document.getElementById("signout-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var go = function () { location.href = "../index.html"; };
      if (!sb || !sb.auth) {
        go();
        return;
      }
      sb.auth.signOut().then(go).catch(go);
    });
  }

  function maybeRedirectInvite(user) {
    var token = "";
    try {
      token = window.LakeClub ? window.LakeClub.tokenFromUrl() : "";
    } catch (err) {}
    if (!token) return false;
    if (user) return false;
    try {
      location.href = "../invite.html?token=" + encodeURIComponent(token);
      return true;
    } catch (err) {
      return false;
    }
  }

  function boot() {
    window.LAKE_USER_ID = window.LAKE_USER_ID || "";
    window.LAKE_USER_EMAIL = window.LAKE_USER_EMAIL || "";
    window.LAKE_SB = null;
    window.LAKE_CLUB = guestClub();
    paintAuth("");

    if (!window.supabase || !window.LAKE_SUPABASE_URL || !window.LAKE_SUPABASE_ANON) {
      bindSignOut(null);
      loadApp();
      return;
    }

    var sb;
    try {
      sb = window.supabase.createClient(window.LAKE_SUPABASE_URL, window.LAKE_SUPABASE_ANON);
    } catch (err) {
      bindSignOut(null);
      loadApp();
      return;
    }

    window.LAKE_SB = sb;
    bindSignOut(sb);
    sb.auth.getSession().then(function (result) {
      var session = result && result.data && result.data.session;
      var user = session && session.user;
      if (user) {
        window.LAKE_USER_ID = user.id || "";
        window.LAKE_USER_EMAIL = user.email || "";
        paintAuth(window.LAKE_USER_EMAIL);
      }
      if (maybeRedirectInvite(user)) return null;
      if (!user || !window.LakeClub) return window.LAKE_CLUB;
      return window.LakeClub.boot(sb, user);
    }).catch(function () {
      return window.LAKE_CLUB;
    }).then(function (state) {
      if (!state) return;
      window.LAKE_CLUB = state;
      loadApp();
    });
  }

  loadScript("../js/club.js", boot);
})();
