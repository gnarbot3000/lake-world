(function () {
  "use strict";

  var titleEl = document.getElementById("invite-title");
  var copyEl = document.getElementById("invite-copy");
  var errorEl = document.getElementById("invite-error");
  var form = document.getElementById("login-form");
  var acceptBtn = document.getElementById("accept-btn");
  var signedAs = document.getElementById("signed-as");
  var signinBtn = document.getElementById("signin-btn");
  var signupBtn = document.getElementById("signup-btn");
  var sb = null;
  var token = "";
  var invite = null;
  var sessionUser = null;

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg || "";
    errorEl.hidden = !msg;
  }

  function setCopy(title, copy) {
    if (titleEl && title) titleEl.textContent = title;
    if (copyEl && copy) copyEl.textContent = copy;
  }

  function emailRedirectTo() {
    var host = location.hostname;
    if (host === "lake.world" || host === "www.lake.world") return "https://lake.world/";
    if (host.indexOf("github.io") !== -1) return location.origin + "/lake-world/";
    return "https://lake.world/";
  }

  function credentials() {
    var email = (document.getElementById("email").value || "").trim();
    var password = document.getElementById("password").value || "";
    return { email: email, password: password };
  }

  function kindLabel() {
    if (invite && invite.is_junior) return "junior";
    return "adult";
  }

  function paint() {
    if (!invite || !invite.ok) {
      form.hidden = true;
      acceptBtn.hidden = true;
      signedAs.hidden = true;
      if (invite && invite.error) setCopy("Invite not valid", window.LakeClub.errorText(invite.code || invite.error));
      else setCopy("Club invite", "This link is missing or not valid.");
      return;
    }

    if (invite.consumed) {
      form.hidden = true;
      acceptBtn.hidden = true;
      setCopy(
        invite.display_name || "Invite",
        "This one-time invite was already used. If you just accepted it, wait for an admin to approve you."
      );
      return;
    }

    var who = invite.display_name || "a skier";
    if (invite.is_junior) {
      setCopy(
        who,
        "Junior invite for Ski Paradise Cleveland. A parent must accept while signed in. After that, an admin still has to approve."
      );
    } else {
      setCopy(
        who,
        "Adult invite for Ski Paradise Cleveland. Sign in or create an account, then sit pending until an admin approves."
      );
    }

    if (!sessionUser) {
      form.hidden = false;
      acceptBtn.hidden = true;
      signedAs.hidden = true;
      return;
    }

    form.hidden = true;
    acceptBtn.hidden = false;
    acceptBtn.textContent = invite.is_junior ? "Accept as parent" : "Accept invite";
    signedAs.hidden = false;
    signedAs.textContent = "Signed in as " + (sessionUser.email || "") + " · " + kindLabel() + " invite for " + who;
  }

  function afterAccept(res) {
    if (!res || res.ok === false) {
      showError((res && res.error) || "Could not accept this invite.");
      return;
    }
    showError("");
    setCopy(
      (invite && invite.display_name) || "Invite accepted",
      "You're on the pending list. An admin of Ski Paradise Cleveland still needs to approve before you (or this junior) show on the roster."
    );
    form.hidden = true;
    acceptBtn.hidden = true;
    signedAs.hidden = true;
    window.LakeClub.stripInviteQuery();
  }

  function accept() {
    if (!sb || !token) return;
    showError("");
    acceptBtn.disabled = true;
    window.LakeClub.consumeInvite(sb, token).then(afterAccept).catch(function (err) {
      showError((err && err.message) || "Could not accept this invite.");
    }).then(function () {
      acceptBtn.disabled = false;
    });
  }

  function needClient() {
    if (sb) return true;
    showError("Sign in needs a network connection.");
    return false;
  }

  function setBusy(busy) {
    if (signinBtn) signinBtn.disabled = busy;
    if (signupBtn) signupBtn.disabled = busy;
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
      sessionUser = result.data && result.data.user;
      paint();
      accept();
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
      if (result.data && result.data.session && result.data.user) {
        sessionUser = result.data.user;
        paint();
        accept();
        return;
      }
      showError("Account created. Sign In.");
    }).catch(function (err) {
      showError((err && err.message) || "Could not create the account.");
    }).then(function () {
      setBusy(false);
    });
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      signIn();
    });
  }
  if (signupBtn) signupBtn.addEventListener("click", signUp);
  if (acceptBtn) acceptBtn.addEventListener("click", accept);

  token = window.LakeClub ? window.LakeClub.tokenFromUrl() : "";

  if (window.supabase && window.LAKE_SUPABASE_URL && window.LAKE_SUPABASE_ANON) {
    try {
      sb = window.supabase.createClient(window.LAKE_SUPABASE_URL, window.LAKE_SUPABASE_ANON);
    } catch (err) {
      sb = null;
    }
  }

  if (!sb) {
    showError("Needs a network connection.");
    return;
  }

  if (!token) {
    invite = { ok: false, error: "invite_invalid" };
    paint();
    return;
  }

  window.LakeClub.lookupInvite(sb, token).then(function (res) {
    invite = res && res.ok === false
      ? { ok: false, error: res.error, code: res.code }
      : (res || { ok: false, error: "invite_invalid" });
    if (invite && invite.ok !== false) invite.ok = true;
    return sb.auth.getSession();
  }).then(function (result) {
    var session = result && result.data && result.data.session;
    sessionUser = session && session.user ? session.user : null;
    paint();
  }).catch(function () {
    if (!invite) invite = { ok: false, error: "invite_invalid" };
    paint();
  });
})();
