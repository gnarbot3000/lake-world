// Shared IWWF 2026 trick chart and scoring for the trick log and run-video tagging.
// Trick codes and point values: IWWF Waterski Rules 2026, Rule 9.22 Trick Value Chart,
// with the values that take effect on November 1, 2026. Each row: code, description,
// trick number, 2-ski basic, 2-ski reverse, 1-ski basic, 1-ski reverse (null = no value).
(function (root) {
  "use strict";
  var T = [["S","Side Slide","1",20,20,40,40],["TS","Toehold side slide","2",null,null,130,130],["B","180 F-B","3",30,30,60,60],["F","180 B-F","4",30,30,60,60],["O","360 F-F","5a",40,40,90,90],["BB","360 B-B","5b",40,40,90,90],["5B","540 F-B","5c",50,50,110,110],["5F","540 B-F","5d",50,50,110,110],["7F","720 F-F","5e",60,60,130,130],["7B","720 B-B","5f",60,60,130,130],["LB","180 F-B Stepover","6",70,70,110,null],["LF","180 B-F Stepover","7",70,70,110,null],["TB","180 F-B Toehold","8",null,null,100,100],["TF","180 B-F Toehold","9",null,null,100,100],["TO","360 F-F Toehold","10",null,null,200,200],["TBB","360 B-B Toehold","11",null,null,200,200],["T5B","540 F-B Toehold","12",null,null,350,350],["T5F","540 B-F Toehold","13",null,null,350,null],["WB","180 F-B","14",50,50,80,80],["WF","180 B-F","15",50,50,80,80],["WO","360 F-F","16",110,110,150,150],["WBB","360 B-B","17",110,110,150,150],["W5B","540 F-B","18",310,310,310,310],["W5F","540 B-F","19",310,310,310,310],["W7F","720 F-F","20",800,800,800,800],["W7B","720 B-B","21",500,500,500,500],["W9B","900 F-B","22",850,850,850,850],["WLB","180 F-B Stepover","23",110,110,160,null],["WLF","180 B-F Stepover","24",110,110,160,null],["WLO","360 F-F Stepover","25",200,200,260,260],["WLBB","360 B-B Stepover","26",200,200,260,260],["WL5B","540 F-B Stepover","27",300,300,420,420],["WL7F","720 F-F Stepover","27a",700,700,700,700],["WL9B","900 F-B Stepover","27b",800,800,800,800],["WL5F","540 B-F Stepover","28",300,300,420,420],["WL9F","900 B-F Stepover","28a",800,800,800,800],["TWB","180 F-B Toehold","29",null,null,150,150],["TWF","180 B-F Toehold","30",null,null,150,150],["TWO","360 F-F Toehold","31",null,null,300,300],["TWBB","360 B-B Toehold","32",null,null,330,330],["TW5B","540 F-B Toehold","33",null,null,500,500],["TW5F","540 B-F Toehold","34",null,null,500,null],["TW7F","720 F-F Toehold","35",null,null,650,650],["TW7B","720 B-B Toehold","36",null,null,650,null],["TWLB","180 F-B Toehold Stepover","37",null,null,320,null],["TWLF","180 B-F Toehold Stepover","38",null,null,400,null],["TWLO","360 F-F Toehold Stepover","39",null,null,480,480],["TWLBB","360 B-B Toehold Stepover","40",null,null,480,480],["TWL5B","540 F-B Toehold Stepover","41",null,null,600,600],["TWL5F","540 B-F Toehold Stepover","42",null,null,700,null],["SLB","F-B Ski Line","43",null,null,350,350],["SLF","B-F Ski Line","44",null,null,400,400],["SLO","360 F-F Ski Line","45",null,null,400,400],["SLBB","360 B-B Ski Line","46",null,null,450,450],["SL5B","540 F-B Ski Line","47",null,null,550,550],["SL5F","540 B-F Ski Line","48",null,null,550,550],["SL7B","720 B-B Ski Line","49",null,null,750,750],["SL7F","720 F-F Ski Line","50",null,null,900,900],["BFL","Backward Somersault","52",500,500,500,500],["BFLB","180 Wake Flip Half Twist F-B","53",null,null,750,750],["BFLF","180 Wake Flip Half Twist B-F","54",null,null,550,550],["BFLBB","360 Wake Flip Full Twist B-B","55",null,null,800,800],["BFLO","360 Wake Flip Full Twist F-F","56",null,null,850,850],["BFL5B","540 Wake Flip Twist with 540 F-B","57",null,null,950,950],["BFL5F","540 Wake Flip Twist with 540 B-F","58",null,null,900,900],["FFL","Forward Somersault","59",800,800,800,800],["FFLB","180 Forward Somersault with 180 F-B","60",null,null,900,900],["FFLF","180 Forward Somersault with 180 B-F","61",null,null,850,850],["FFLBB","360 Forward Somersault with 360 B-B","62",null,null,1050,1050],["FFL5F","540 Forward Somersault with 540 B-F","63",null,null,1100,1100],["BFLSLB","180 Wake Flip Ski Line with 180 F-B","65",null,null,850,850],["BFLSLBB","360 Wake Flip Ski Line with 360 B-B","66",null,null,950,950],["BFLSLO","360 Wake Flip Ski Line with 360 F-F","67",null,null,950,950],["BFLSL5F","540 Wake Flip Ski Line with 540 B-F","68",null,null,1030,1030],["FFLSL5F","540 Forward Somersault Ski Line with 540 B-F","69",null,null,1150,1150]];

  var BY = {};
  T.forEach(function (r) { BY[r[0]] = r; });
  var MAX_FLIPS = 6;

  function isFlip(r) { return parseInt(r[2], 10) >= 52; }
  function is180(r) { return !isFlip(r) && /^180 /.test(r[1]); }
  function value(r, rev, skis) { return skis === 2 ? (rev ? r[4] : r[3]) : (rev ? r[6] : r[5]); }

  // Each trick number scores once as a basic and once as a reverse.
  // A reverse needs its basic earlier in the same pass, with only 180s in between.
  // At most 6 flips score. A run is two passes.
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

  root.LakeTricks = {
    chart: T,
    byCode: BY,
    maxFlips: MAX_FLIPS,
    isFlip: isFlip,
    is180: is180,
    value: value,
    score: score
  };
})(typeof window !== "undefined" ? window : this);
