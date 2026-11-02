// Trick ski run calculator and log for /trick-ski-log.
// Chart and scoring live in /js/trick-chart.js (IWWF Waterski Rules 2026, Rule 9.22).
(function () {
  "use strict";
  var LT = window.LakeTricks;
  var root = document.getElementById("tcalc");
  if (!root || !LT) return;
  var T = LT.chart;
  var BY = LT.byCode;
  var KEY = "lake-trick-runs";
  var state = { skis: 1, passes: [[], []] };
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function value(r, rev, skis) { return LT.value(r, rev, skis); }
  function score(passes, skis) { return LT.score(passes, skis); }

  function fillSelect() {
    var sel = $("tc-trick");
    while (sel.firstChild) sel.removeChild(sel.firstChild);
    T.forEach(function (r) {
      var b = value(r, false, state.skis), rv = value(r, true, state.skis);
      if (b == null) return;
      var o = el("option", null, r[0] + " · " + r[1] + " · " + b + (rv == null ? "" : " / R " + rv));
      o.value = r[0];
      sel.appendChild(o);
    });
  }

  function render() {
    var s = score(state.passes, state.skis);
    [0, 1].forEach(function (p) {
      var ul = $("tc-p" + p);
      while (ul.firstChild) ul.removeChild(ul.firstChild);
      state.passes[p].forEach(function (t, j) {
        var r = BY[t.code], res = s.items[p][j];
        var li = el("li", res.why ? "tc-zero" : "");
        li.appendChild(el("span", "tc-code", (t.rev ? "R" : "") + t.code));
        li.appendChild(el("span", "tc-desc", (t.rev ? "Reverse " : "") + r[1] + (res.why ? " · " + res.why : "")));
        li.appendChild(el("span", "tc-pts", String(res.pts)));
        var x = el("button", "tc-x", "×");
        x.type = "button";
        x.setAttribute("aria-label", "Remove " + (t.rev ? "R" : "") + t.code);
        x.onclick = function () { state.passes[p].splice(j, 1); render(); };
        li.appendChild(x);
        ul.appendChild(li);
      });
      $("tc-t" + p).textContent = String(s.totals[p]);
    });
    $("tc-total").textContent = String(s.total);
    return s;
  }

  function loadRuns() { try { var a = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function saveRuns(a) { try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, 50))); } catch (e) {} }
  function clean(list) { return (Array.isArray(list) ? list : []).filter(function (t) { return t && Object.prototype.hasOwnProperty.call(BY, t.code); }).map(function (t) { return { code: t.code, rev: !!t.rev }; }); }

  function renderRuns() {
    var ul = $("tc-runs"), runs = loadRuns();
    while (ul.firstChild) ul.removeChild(ul.firstChild);
    $("tc-runs-empty").hidden = runs.length > 0;
    runs.forEach(function (run, i) {
      var skis = run.skis === 2 ? 2 : 1;
      var passes = [clean(run.passes && run.passes[0]), clean(run.passes && run.passes[1])];
      var s = score(passes, skis);
      var li = el("li");
      var d = new Date(run.at);
      li.appendChild(el("span", "tc-desc", (isNaN(d) ? "" : d.toLocaleDateString()) + " · " + skis + (skis === 1 ? " ski" : " skis") + " · " + passes[0].length + " + " + passes[1].length + " tricks"));
      li.appendChild(el("span", "tc-pts", s.total + " pts"));
      var open = el("button", "tc-x", "Open");
      open.type = "button";
      open.onclick = function () { state.skis = skis; state.passes = passes; syncSkis(); render(); root.scrollIntoView({ behavior: "smooth" }); };
      var del = el("button", "tc-x", "×");
      del.type = "button";
      del.setAttribute("aria-label", "Delete this run");
      del.onclick = function () { var a = loadRuns(); a.splice(i, 1); saveRuns(a); renderRuns(); };
      li.appendChild(open);
      li.appendChild(del);
      ul.appendChild(li);
    });
  }

  function syncSkis() {
    root.querySelectorAll("[data-skis]").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.dataset.skis === state.skis)); });
    fillSelect();
  }

  root.querySelectorAll("[data-skis]").forEach(function (b) {
    b.onclick = function () { state.skis = +b.dataset.skis; syncSkis(); render(); };
  });
  root.querySelectorAll("[data-add]").forEach(function (b) {
    b.onclick = function () {
      var code = $("tc-trick").value;
      if (!Object.prototype.hasOwnProperty.call(BY, code)) return;
      state.passes[+$("tc-pass").value].push({ code: code, rev: b.dataset.add === "rev" });
      render();
    };
  });
  $("tc-example").onclick = function () {
    state.skis = 1;
    state.passes = [
      [{ code: "S" }, { code: "S", rev: true }, { code: "B" }, { code: "F" }, { code: "B", rev: true }, { code: "F", rev: true }],
      [{ code: "WB" }, { code: "WF" }, { code: "WB", rev: true }, { code: "WF", rev: true }, { code: "WO" }, { code: "WO", rev: true }]
    ].map(clean);
    syncSkis(); render();
  };
  $("tc-clear").onclick = function () { state.passes = [[], []]; render(); };
  $("tc-save").onclick = function () {
    if (!state.passes[0].length && !state.passes[1].length) return;
    var a = loadRuns();
    a.unshift({ at: Date.now(), skis: state.skis, passes: state.passes });
    saveRuns(a);
    renderRuns();
    $("tc-saved").textContent = "Saved on this device.";
  };
  syncSkis(); render(); renderRuns();
})();
