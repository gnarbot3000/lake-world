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

  function canLoadClubRoster() {
    try {
      if (location.protocol === "file:") return true;
    } catch (err) {}
    return !!(window.LAKE_USER_ID);
  }

  function loadApp() {
    var start = function () {
      loadScript("app.js");
    };
    if (canLoadClubRoster()) {
      loadScript("club-roster.js", start);
    } else {
      start();
    }
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

  function boot() {
    window.LAKE_USER_ID = window.LAKE_USER_ID || "";
    window.LAKE_USER_EMAIL = window.LAKE_USER_EMAIL || "";
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

    bindSignOut(sb);
    sb.auth.getSession().then(function (result) {
      var session = result && result.data && result.data.session;
      var user = session && session.user;
      if (user) {
        window.LAKE_USER_ID = user.id || "";
        window.LAKE_USER_EMAIL = user.email || "";
        paintAuth(window.LAKE_USER_EMAIL);
      }
    }).catch(function () {
      /* guest still works */
    }).then(function () {
      loadApp();
    });
  }

  boot();
})();
