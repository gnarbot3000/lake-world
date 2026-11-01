(function () {
  var errorDiv = document.getElementById("auth-error");
  var signinBtn = document.getElementById("signin-btn");
  var signupBtn = document.getElementById("signup-btn");
  var navSignin = document.getElementById("nav-signin");
  var form = document.getElementById("login-form");
  var sb = null;

  if (navSignin) {
    navSignin.addEventListener("click", function () {
      var email = document.getElementById("email");
      if (email) email.focus();
    });
  }

  // Supabase auth errors read like server logs; say what to do instead.
  function plainAuthError(msg) {
    var m = String(msg || "").toLowerCase();
    if (m.indexOf("invalid login") !== -1) return "That email and password don't match. Check them, or tap Create account if you're new.";
    if (m.indexOf("already registered") !== -1 || m.indexOf("already been registered") !== -1) return "You already have an account with this email. Tap Sign In instead.";
    if (m.indexOf("not confirmed") !== -1) return "Open the link we emailed you, then Sign In.";
    if (m.indexOf("rate limit") !== -1 || m.indexOf("security purposes") !== -1 || m.indexOf("too many") !== -1) return "Too many tries for now. Wait a minute, then try again.";
    if (m.indexOf("valid email") !== -1 || m.indexOf("invalid email") !== -1 || m.indexOf("unable to validate email") !== -1) return "That email address doesn't look right. Check it and try again.";
    if (m.indexOf("password") !== -1) return "Passwords need at least 6 characters.";
    if (m.indexOf("fetch") !== -1 || m.indexOf("network") !== -1) return "Couldn't reach lake.world. Check your connection and try again.";
    return "Something went wrong. Please try again.";
  }

  function showError(msg, ok) {
    errorDiv.style.color = ok ? "#8fd18f" : "#ff6b6b";
    errorDiv.textContent = msg || "";
    errorDiv.style.display = msg ? "block" : "none";
  }

  function inviteQuery() {
    try {
      var q = new URLSearchParams(location.search || "");
      var tok = (q.get("invite") || q.get("token") || "").trim();
      return tok ? ("?invite=" + encodeURIComponent(tok)) : "";
    } catch (err) {
      return "";
    }
  }

  function goApp() {
    location.href = "app/" + inviteQuery();
  }

  function emailRedirectTo() {
    var host = location.hostname;
    if (host === "lake.world" || host === "www.lake.world") return "https://lake.world/";
    if (host.indexOf("github.io") !== -1) return location.origin + "/lake-world/";
    return "https://gnarbot3000.github.io/lake-world/";
  }

  function credentials() {
    var email = (document.getElementById("email").value || "").trim();
    var password = document.getElementById("password").value || "";
    return { email: email, password: password };
  }

  function needClient() {
    if (sb) return true;
    showError("Sign in needs a network connection.");
    return false;
  }

  function setBusy(busy) {
    signinBtn.disabled = busy;
    signupBtn.disabled = busy;
  }

  function signIn() {
    if (!needClient()) return;
    var creds = credentials();
    if (!creds.email || !creds.password) {
      showError("Enter an email and password.");
      return;
    }
    showError("");
    setBusy(true);
    sb.auth.signInWithPassword({ email: creds.email, password: creds.password }).then(function (result) {
      if (result.error) {
        showError(plainAuthError(result.error.message));
        return;
      }
      goApp();
    }).catch(function (err) {
      showError(plainAuthError(err && err.message));
    }).then(function () {
      setBusy(false);
    });
  }

  function signUp() {
    if (!needClient()) return;
    var creds = credentials();
    if (!creds.email || !creds.password) {
      showError("Enter an email and password.");
      return;
    }
    if (creds.password.length < 6) {
      showError("Password must be at least 6 characters.");
      return;
    }
    showError("");
    setBusy(true);
    sb.auth.signUp({
      email: creds.email,
      password: creds.password,
      options: { emailRedirectTo: emailRedirectTo() }
    }).then(function (result) {
      if (result.error) {
        showError(plainAuthError(result.error.message));
        return;
      }
      if (result.data && result.data.session) {
        goApp();
        return;
      }
      return sb.auth.signInWithPassword({ email: creds.email, password: creds.password }).then(function (signed) {
        if (signed.error) {
          showError("Account created. Open the link we emailed you, then Sign In.", true);
          return;
        }
        goApp();
      });
    }).catch(function (err) {
      showError(plainAuthError(err && err.message));
    }).then(function () {
      setBusy(false);
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    signIn();
  });
  signupBtn.addEventListener("click", function () {
    signUp();
  });

  if (window.supabase && window.LAKE_SUPABASE_URL && window.LAKE_SUPABASE_ANON) {
    try {
      sb = window.supabase.createClient(window.LAKE_SUPABASE_URL, window.LAKE_SUPABASE_ANON);
    } catch (err) {
      sb = null;
    }
  }

  if (sb) {
    sb.auth.getSession().then(function (result) {
      var session = result && result.data && result.data.session;
      if (session && session.user) goApp();
    }).catch(function () {});
  }
})();
