(function () {
  "use strict";

  function paintAuth(email) {
    var wrap = document.getElementById("mast-auth");
    var el = document.getElementById("mast-user-email");
    if (el) el.textContent = email || "";
    if (wrap) wrap.hidden = !email;
  }

  function loadApp() {
    var s = document.createElement("script");
    s.src = "app.js";
    s.async = false;
    document.body.appendChild(s);
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
