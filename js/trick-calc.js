// Trick ski run calculator and log for /trick-ski-log.
// Trick codes and point values: IWWF Waterski Rules 2026, Rule 9.22 Trick Value Chart,
// with the values that take effect on November 1, 2026. Each row: code, description,
// trick number, 2-ski basic, 2-ski reverse, 1-ski basic, 1-ski reverse (null = no value).
(function () {
  "use strict";
  var T = [["S","Side Slide","1",20,20,40,40],["TS","Toehold side slide","2",null,null,130,130],["B","180 F-B","3",30,30,60,60],["F","180 B-F","4",30,30,60,60],["O","360 F-F","5a",40,40,90,90],["BB","360 B-B","5b",40,40,90,90],["5B","540 F-B","5c",50,50,110,110],["5F","540 B-F","5d",50,50,110,110],["7F","720 F-F","5e",60,60,130,130],["7B","720 B-B","5f",60,60,130,130],["LB","180 F-B Stepover","6",70,70,110,null],["LF","180 B-F Stepover","7",70,70,110,null],["TB","180 F-B Toehold","8",null,null,100,100],["TF","180 B-F Toehold","9",null,null,100,100],["TO","360 F-F Toehold","10",null,null,200,200],["TBB","360 B-B Toehold","11",null,null,200,200],["T5B","540 F-B Toehold","12",null,null,350,350],["T5F","540 B-F Toehold","13",null,null,350,null],["WB","180 F-B","14",50,50,80,80],["WF","180 B-F","15",50,50,80,80],["WO","360 F-F","16",110,110,150,150],["WBB","360 B-B","17",110,110,150,150],["W5B","540 F-B","18",310,310,310,310],["W5F","540 B-F","19",310,310,310,310],["W7F","720 F-F","20",800,800,800,800],["W7B","720 B-B","21",500,500,500,500],["W9B","900 F-B","22",850,850,850,850],["WLB","180 F-B Stepover","23",110,110,160,null],["WLF","180 B-F Stepover","24",110,110,160,null],["WLO","360 F-F Stepover","25",200,200,260,260],["WLBB","360 B-B Stepover","26",200,200,260,260],["WL5B","540 F-B Stepover","27",300,300,420,420],["WL7F","720 F-F Stepover","27a",700,700,700,700],["WL9B","900 F-B Stepover","27b",800,800,800,800],["WL5F","540 B-F Stepover","28",300,300,420,420],["WL9F","900 B-F Stepover","28a",800,800,800,800],["TWB","180 F-B Toehold","29",null,null,150,150],["TWF","180 B-F Toehold","30",null,null,150,150],["TWO","360 F-F Toehold","31",null,null,300,300],["TWBB","360 B-B Toehold","32",null,null,330,330],["TW5B","540 F-B Toehold","33",null,null,500,500],["TW5F","540 B-F Toehold","34",null,null,500,null],["TW7F","720 F-F Toehold","35",null,null,650,650],["TW7B","720 B-B Toehold","36",null,null,650,null],["TWLB","180 F-B Toehold Stepover","37",null,null,320,null],["TWLF","180 B-F Toehold Stepover","38",null,null,400,null],["TWLO","360 F-F Toehold Stepover","39",null,null,480,480],["TWLBB","360 B-B Toehold Stepover","40",null,null,480,480],["TWL5B","540 F-B Toehold Stepover","41",null,null,600,600],["TWL5F","540 B-F Toehold Stepover","42",null,null,700,null],["SLB","F-B Ski Line","43",null,null,350,350],["SLF","B-F Ski Line","44",null,null,400,400],["SLO","360 F-F Ski Line","45",null,null,400,400],["SLBB","360 B-B Ski Line","46",null,null,450,450],["SL5B","540 F-B Ski Line","47",null,null,550,550],["SL5F","540 B-F Ski Line","48",null,null,550,550],["SL7B","720 B-B Ski Line","49",null,null,750,750],["SL7F","720 F-F Ski Line","50",null,null,900,900],["BFL","Backward Somersault","52",500,500,500,500],["BFLB","180 Wake Flip Half Twist F-B","53",null,null,750,750],["BFLF","180 Wake Flip Half Twist B-F","54",null,null,550,550],["BFLBB","360 Wake Flip Full Twist B-B","55",null,null,800,800],["BFLO","360 Wake Flip Full Twist F-F","56",null,null,850,850],["BFL5B","540 Wake Flip Twist with 540 F-B","57",null,null,950,950],["BFL5F","540 Wake Flip Twist with 540 B-F","58",null,null,900,900],["FFL","Forward Somersault","59",800,800,800,800],["FFLB","180 Forward Somersault with 180 F-B","60",null,null,900,900],["FFLF","180 Forward Somersault with 180 B-F","61",null,null,850,850],["FFLBB","360 Forward Somersault with 360 B-B","62",null,null,1050,1050],["FFL5F","540 Forward Somersault with 540 B-F","63",null,null,1100,1100],["BFLSLB","180 Wake Flip Ski Line with 180 F-B","65",null,null,850,850],["BFLSLBB","360 Wake Flip Ski Line with 360 B-B","66",null,null,950,950],["BFLSLO","360 Wake Flip Ski Line with 360 F-F","67",null,null,950,950],["BFLSL5F","540 Wake Flip Ski Line with 540 B-F","68",null,null,1030,1030],["FFLSL5F","540 Forward Somersault Ski Line with 540 B-F","69",null,null,1150,1150]];
  var BY = {};
  T.forEach(function (r) { BY[r[0]] = r; });
  var KEY = "lake-trick-runs";
  var MAX_FLIPS = 6;
  var root = document.getElementById("tcalc");
  if (!root) return;
  var state = { skis: 1, passes: [[], []] };
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function isFlip(r) { return parseInt(r[2], 10) >= 52; }
  function is180(r) { return !isFlip(r) && /^180 /.test(r[1]); }
  function value(r, rev, skis) { return skis === 2 ? (rev ? r[4] : r[3]) : (rev ? r[6] : r[5]); }

  // Score a run with the main rules: each trick number counts once as a basic and once as a reverse,
  // a reverse needs its basic earlier in the same pass with only 180s in between, and at most 6 flips.
  function score(passes, skis) {
    var done = {}, flips = 0, totals = [0, 0];
    var out = passes.map(function (list, p) {
      return list.map(function (t, j) {
        var r = BY[t.code], v = value(r, t.rev, skis), why = "";
        if (v == null) why = t.rev ? "no reverse value on " + skis + (skis === 1 ? " ski" : " skis") : "not scored on " + skis + (skis === 1 ? " ski" : " skis");
        else if (t.rev) {
          var ok = false;
          for (var k = j - 1; k >= 0; k--) {
            var o = list[k];
            if (o.code === t.code && !o.rev) { ok = true; break; }
            if (!is180(BY[o.code])) break;
          }
          if (!ok) why = "a reverse must follow its basic in the same pass";
        }
        var key = r[2] + (t.rev ? "R" : "B");
        if (!why && done[key]) why = "already scored this run";
        if (!why && isFlip(r) && flips >= MAX_FLIPS) why = "only 6 flips score";
        if (!why) { done[key] = 1; if (isFlip(r)) flips++; totals[p] += v; return { pts: v, why: "" }; }
        return { pts: 0, why: why };
      });
    });
    return { items: out, totals: totals, total: totals[0] + totals[1] };
  }

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
