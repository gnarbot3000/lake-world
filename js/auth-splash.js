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

  function showError(msg, ok) {
    errorDiv.style.color = ok ? "#8fd18f" : "#ff6b6b";
    errorDiv.textContent = msg || "";
    errorDiv.style.display = msg ? "block" : "none";
  }

  function goPreview() {
    location.href = "preview/index.html";
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
        showError(result.error.message);
        return;
      }
      goPreview();
    }).catch(function (err) {
      showError((err && err.message) || "Sign in failed.");
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
        showError(result.error.message);
        return;
      }
      if (result.data && result.data.session) {
        goPreview();
        return;
      }
      showError("Account created. Sign In.", true);
    }).catch(function (err) {
      showError((err && err.message) || "Could not create the account.");
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
      if (session && session.user) goPreview();
    }).catch(function () {});
  }
})();
