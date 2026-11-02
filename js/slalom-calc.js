// Slalom score calculator for /slalom-score-calculator.
// Rope lengths: IWWF Waterski Rules 2026, Rule 5.09e (metres, longest first).
// Feet off: USA Water Ski & Wake Sports 2026 Official Tournament Rules, Rule 10.06.G,
// the feet-off name for the same metre length. 23.00 m and 9.25 m are on that AWSA
// matrix and are not in Rule 5.09e, so they are not in this total.
// Speeds: IWWF Rule 8.05 slalom boat-time chart (kph). mph from AWSA Rule 10.06.G.
// Partials: IWWF Rule 8.09 scores 1/4, 1/2, or 1. There is no 3/4.
// Total: completed passes at the chosen speed from 18.25 m down to the line before
// this pass, plus the buoys on this pass. IWWF Rule 15.03 and Rule 15.04
// ("3@13 = 21 buoys starting the count at 18.25"; "6@12 or 30 buoys").
(function () {
  "use strict";
  var LINES = [
    { cm: 1825, off: "15", color: "red" },
    { cm: 1600, off: "22", color: "orange" },
    { cm: 1425, off: "28", color: "yellow" },
    { cm: 1300, off: "32", color: "green" },
    { cm: 1200, off: "35", color: "blue" },
    { cm: 1125, off: "38", color: "violet (blue/white)" },
    { cm: 1075, off: "39.5", color: "white" },
    { cm: 1025, off: "41", color: "pink" },
    { cm: 975, off: "43", color: "black" },
    { cm: 950, off: "44", color: "red" }
  ];
  var SPEEDS = [
    { kph: 25, mph: "15.5" }, { kph: 28, mph: "17.4" }, { kph: 31, mph: "19.2" },
    { kph: 34, mph: "21.1" }, { kph: 37, mph: "23.0" }, { kph: 40, mph: "24.9" },
    { kph: 43, mph: "26.7" }, { kph: 46, mph: "28.6" }, { kph: 49, mph: "30.4" },
    { kph: 52, mph: "32.3" }, { kph: 55, mph: "34.2" }, { kph: 58, mph: "36.0" }
  ];
  var BY_KPH = {};
  var BY_CM = {};
  var BY_Q = {};
  SPEEDS.forEach(function (s) { BY_KPH[String(s.kph)] = s; });
  LINES.forEach(function (l) { BY_CM[String(l.cm)] = l; });
  var QUARTERS = [];
  var b;
  for (b = 0; b < 6; b++) {
    QUARTERS.push(b * 4, b * 4 + 1, b * 4 + 2);
  }
  QUARTERS.push(24);
  QUARTERS.forEach(function (q) { BY_Q[String(q)] = 1; });

  var KEY = "lake-slalom-runs";
  var MAX = 50;
  var root = document.getElementById("scalc");
  if (!root) return;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function metres(cm) { return (cm / 100).toFixed(2); }
  function buoyText(q) {
    var whole = Math.floor(q / 4);
    var rem = q % 4;
    if (rem === 0) return String(whole);
    if (rem === 1) return whole ? whole + " 1/4" : "1/4";
    if (rem === 2) return whole ? whole + " 1/2" : "1/2";
    return "";
  }
  function knownKph(kph) { return Object.prototype.hasOwnProperty.call(BY_KPH, String(kph)); }
  function knownCm(cm) { return Object.prototype.hasOwnProperty.call(BY_CM, String(cm)); }
  function knownQ(q) { return Object.prototype.hasOwnProperty.call(BY_Q, String(q)); }

  function score(kph, cm, q) {
    var idx = -1;
    var i;
    for (i = 0; i < LINES.length; i++) if (LINES[i].cm === cm) idx = i;
    var passes = [];
    for (i = 0; i < idx; i++) passes.push({ cm: LINES[i].cm, q: 24 });
    passes.push({ cm: cm, q: q });
    var totalQ = 0;
    for (i = 0; i < passes.length; i++) totalQ += passes[i].q;
    return { kph: kph, passes: passes, totalQ: totalQ, finalQ: q };
  }

  function fillSelect(sel, items, value, label) {
    while (sel.firstChild) sel.removeChild(sel.firstChild);
    items.forEach(function (item) {
      var o = el("option", null, label(item));
      o.value = value(item);
      sel.appendChild(o);
    });
  }

  function read() {
    var kph = +$("sc-speed").value;
    var cm = +$("sc-line").value;
    var q = +$("sc-buoys").value;
    if (!knownKph(kph) || !knownCm(cm) || !knownQ(q)) return null;
    return score(kph, cm, q);
  }

  function render() {
    var s = read();
    var ul = $("sc-passes");
    while (ul.firstChild) ul.removeChild(ul.firstChild);
    if (!s) {
      $("sc-total").textContent = "—";
      $("sc-written").textContent = "";
      return null;
    }
    var speed = BY_KPH[String(s.kph)];
    s.passes.forEach(function (p, i) {
      var line = BY_CM[String(p.cm)];
      var li = el("li");
      var desc = metres(p.cm) + " m · " + line.off + " ft off";
      if (p.q === 24) desc += " · complete pass";
      else desc += " · this pass";
      li.appendChild(el("span", "tc-desc", "Pass " + (i + 1) + " · " + desc));
      li.appendChild(el("span", "tc-pts", buoyText(p.q)));
      ul.appendChild(li);
    });
    $("sc-total").textContent = buoyText(s.totalQ);
    var fin = BY_CM[String(s.passes[s.passes.length - 1].cm)];
    $("sc-written").textContent = buoyText(s.finalQ) + " @ " + speed.kph + " kph (" + speed.mph + " mph) / " + metres(fin.cm) + " m (" + fin.off + " ft off)";
    return s;
  }

  function loadRuns() {
    try {
      var a = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (!Array.isArray(a)) return [];
      return a.filter(validRun).slice(0, MAX);
    } catch (e) {
      return [];
    }
  }
  function validRun(run) {
    if (!run || typeof run !== "object") return false;
    if (!Object.prototype.hasOwnProperty.call(run, "kph")) return false;
    if (!Object.prototype.hasOwnProperty.call(run, "cm")) return false;
    if (!Object.prototype.hasOwnProperty.call(run, "q")) return false;
    return knownKph(run.kph) && knownCm(run.cm) && knownQ(run.q);
  }
  function saveRuns(a) {
    try {
      localStorage.setItem(KEY, JSON.stringify(a.slice(0, MAX)));
      return true;
    } catch (e) {
      return false;
    }
  }

  function renderRuns() {
    var ul = $("sc-runs");
    var runs = loadRuns();
    while (ul.firstChild) ul.removeChild(ul.firstChild);
    $("sc-runs-empty").hidden = runs.length > 0;
    runs.forEach(function (run, i) {
      var s = score(run.kph, run.cm, run.q);
      var speed = BY_KPH[String(run.kph)];
      var line = BY_CM[String(run.cm)];
      var d = new Date(run.at);
      var when = isNaN(d.getTime()) ? "" : d.toLocaleDateString();
      var li = el("li");
      var desc = (when ? when + " · " : "") + speed.kph + " kph · " + line.off + " ft off · " + buoyText(run.q) + " on the pass";
      li.appendChild(el("span", "tc-desc", desc));
      li.appendChild(el("span", "tc-pts", buoyText(s.totalQ)));
      var open = el("button", "tc-x", "Open");
      open.type = "button";
      open.onclick = function () {
        $("sc-speed").value = String(run.kph);
        $("sc-line").value = String(run.cm);
        $("sc-buoys").value = String(run.q);
        render();
        root.scrollIntoView({ behavior: "smooth" });
      };
      var del = el("button", "tc-x", "×");
      del.type = "button";
      del.setAttribute("aria-label", "Delete this run");
      del.onclick = function () {
        var next = loadRuns();
        next.splice(i, 1);
        saveRuns(next);
        renderRuns();
      };
      li.appendChild(open);
      li.appendChild(del);
      ul.appendChild(li);
    });
  }

  fillSelect($("sc-speed"), SPEEDS.slice().reverse(), function (s) { return String(s.kph); }, function (s) {
    return s.kph + " kph · " + s.mph + " mph";
  });
  fillSelect($("sc-line"), LINES, function (l) { return String(l.cm); }, function (l) {
    return l.off + " ft off · " + metres(l.cm) + " m";
  });
  fillSelect($("sc-buoys"), QUARTERS, function (q) { return String(q); }, buoyText);
  $("sc-speed").value = "58";
  $("sc-line").value = "1825";
  $("sc-buoys").value = "0";

  ["sc-speed", "sc-line", "sc-buoys"].forEach(function (id) {
    $(id).onchange = function () { render(); };
  });
  $("sc-example").onclick = function () {
    $("sc-speed").value = "58";
    $("sc-line").value = "1300";
    $("sc-buoys").value = "12";
    render();
  };
  $("sc-clear").onclick = function () {
    $("sc-speed").value = "58";
    $("sc-line").value = "1825";
    $("sc-buoys").value = "0";
    render();
  };
  $("sc-save").onclick = function () {
    var s = read();
    var note = $("sc-saved");
    if (!s) {
      note.textContent = "Pick a speed, a rope, and a buoy count first.";
      return;
    }
    var a = loadRuns();
    a.unshift({ at: Date.now(), kph: s.kph, cm: s.passes[s.passes.length - 1].cm, q: s.finalQ });
    if (saveRuns(a)) note.textContent = "Saved on this device.";
    else note.textContent = "Could not save on this device.";
    renderRuns();
  };

  render();
  renderRuns();
})();
