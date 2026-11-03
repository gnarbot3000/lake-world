(function () {
  "use strict";
  var form = document.getElementById("club-form");
  if (!form) return;
  var statusEl = document.getElementById("club-status");
  var btn = document.getElementById("club-submit");
  var loadedAt = Date.now();
  var sent = false;

  var PICK = {
    contact_role: ["admin", "coach", "member", "other"],
    club_type: ["water_ski_club", "ski_school", "tournament_site", "private_lake", "other"],
    member_count: ["1-10", "11-25", "26-50", "51-100", "100+"],
    country: ["", "US", "CA", "GB", "IE", "AU", "NZ", "DE", "FR", "IT", "ES", "NL", "other"],
    sports: ["slalom", "trick", "jump", "kneeboard", "wakeboard", "barefoot", "other"]
  };
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  function show(kind, text) {
    statusEl.className = "club-status club-status-" + kind;
    statusEl.textContent = text;
    statusEl.hidden = false;
    if (kind === "ok") statusEl.focus();
  }

  var FALLBACK = "Sorry, we couldn't save your request just now. Please try again later. " +
    "You can still create a free account and try the club board today.";
  var NOT_OPEN = "Thanks for your interest. Club requests aren't open on this page yet, so nothing was saved. " +
    "Please check back soon, or create a free account and try the club board today.";
  var THANKS = "Thanks, we got it. We'll reply to the email you gave about setting up your club board.";

  function collect() {
    var f = form.elements;
    var sports = [];
    Array.prototype.forEach.call(form.querySelectorAll('input[name="sports"]:checked'), function (el) {
      if (PICK.sports.indexOf(el.value) !== -1 && sports.indexOf(el.value) === -1) sports.push(el.value);
    });
    var notes = (f.notes.value || "").trim().slice(0, 500);
    return {
      club_name: (f.club_name.value || "").trim().slice(0, 100),
      contact_email: (f.contact_email.value || "").trim().toLowerCase().slice(0, 254),
      contact_role: f.contact_role.value,
      club_type: f.club_type.value,
      member_count: f.member_count.value,
      sports: sports,
      country: f.country.value || null,
      notes: notes || null
    };
  }

  function validate(d) {
    if (d.club_name.length < 2) return "Please enter your club's name.";
    if (d.contact_email.length < 6 || !EMAIL_RE.test(d.contact_email)) return "Please enter a valid email so we can reply.";
    if (PICK.contact_role.indexOf(d.contact_role) === -1) return "Please pick your role.";
    if (PICK.club_type.indexOf(d.club_type) === -1) return "Please pick what kind of club it is.";
    if (PICK.member_count.indexOf(d.member_count) === -1) return "Please pick roughly how many members you have.";
    if (PICK.country.indexOf(d.country || "") === -1) return "Please pick a country from the list.";
    return "";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (sent) return;
    // Honeypot or an instant submit: act done, save nothing, send no event.
    if ((form.elements.website.value || "") !== "" || Date.now() - loadedAt < 1500) {
      form.hidden = true;
      show("ok", THANKS);
      sent = true;
      return;
    }
    var d = collect();
    var err = validate(d);
    if (err) { show("err", err); return; }

    if (window.LAKE_CLUB_REQUESTS_LIVE !== true || !window.LAKE_SUPABASE_URL || !window.LAKE_SUPABASE_ANON) {
      show("err", NOT_OPEN);
      return;
    }

    btn.disabled = true;
    btn.textContent = "Sending…";
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 12000);
    fetch(window.LAKE_SUPABASE_URL + "/rest/v1/club_requests", {
      method: "POST",
      headers: {
        "apikey": window.LAKE_SUPABASE_ANON,
        "Authorization": "Bearer " + window.LAKE_SUPABASE_ANON,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(d),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      clearTimeout(timer);
      if (res.status !== 201 && res.status !== 204) throw new Error("save_failed");
      sent = true;
      form.hidden = true;
      show("ok", THANKS);
      if (typeof window.gtag === "function") {
        window.gtag("event", "club_request_submit", {
          club_type: d.club_type,
          member_count: d.member_count,
          sports_count: d.sports.length
        });
      }
    }).catch(function () {
      clearTimeout(timer);
      btn.disabled = false;
      btn.textContent = "Request a club board";
      show("err", FALLBACK);
    });
  });
})();
