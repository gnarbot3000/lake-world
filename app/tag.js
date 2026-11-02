// Tag a run video on this device. The file is played with URL.createObjectURL
// and is never stored or uploaded. Saved runs keep the file name, duration, and tags.
(function () {
  "use strict";

  var RUN_KEY = "lake-run-videos";
  var GUEST_KEY = "nrs-ski-lake-tricks-v2";
  var TRICK_KEY = "lake-trick-runs";
  var MAX_RUNS = 40;
  var MAX_TAGS = 120;
  var MAX_UNDO = 40;
  var MAX_SETS = 300;
  var MAX_TRICK_RUNS = 50;
  var MAX_NAME = 180;
  var MAX_NOTE = 80;
  var MAX_DURATION = 28800;
  var STEP = 0.5;

  var OFFS = [15, 22, 28, 32];
  var MPHS = [20, 22, 24, 26, 28, 30, 32, 34, 36];
  var METERS = { 15: "18.25 m", 22: "16 m", 28: "14.25 m", 32: "13 m" };
  var KPH = { 20: 32, 22: 35, 24: 39, 26: 42, 28: 46, 30: 49, 32: 52, 34: 55, 36: 58 };

  var fileInput = document.getElementById("rv-file");
  var video = document.getElementById("rv-video");
  var stage = document.getElementById("rv-stage");
  var LT = window.LakeTricks;

  var state = {
    url: "",
    fileName: "",
    duration: 0,
    ready: false,
    mode: "",
    units: "mph",
    seq: 1,
    slalom: { tags: [], undo: [], off: 15, mph: 28, note: "" },
    trick: { tags: [], undo: [], skis: 1, pass: 0 }
  };

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function round3(n) { return Math.round(n * 1000) / 1000; }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function newId(prefix) {
    state.seq += 1;
    return prefix + "-" + Date.now().toString(36) + "-" + state.seq.toString(36);
  }
  function cleanText(value, max) {
    var s = String(value == null ? "" : value).replace(/[\u0000-\u001F\u007F]/g, "").trim();
    if (s.length > max) s = s.slice(0, max);
    return s;
  }
  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var m = Math.floor(t / 60);
    var s = t - m * 60;
    var whole = Math.floor(s);
    var tenth = Math.floor((s - whole) * 10 + 1e-6);
    if (tenth > 9) tenth = 9;
    return m + ":" + pad(whole) + "." + tenth;
  }
  function byTime(a, b) {
    if (a.t !== b.t) return a.t - b.t;
    return (a.n || 0) - (b.n || 0);
  }
  function setStatus(text) {
    $("rv-status").textContent = text || "";
  }
  function readUnits() {
    try {
      var raw = localStorage.getItem(GUEST_KEY);
      if (!raw) return "mph";
      var parsed = JSON.parse(raw);
      if (parsed && parsed.units === "kph") return "kph";
    } catch (err) {}
    return "mph";
  }
  function lineLabel(off) {
    if (state.units === "kph") return METERS[off] || (off + " off");
    return off + " off";
  }
  function speedLabel(mph) {
    if (state.units === "kph") return (KPH[mph] || mph) + " kph";
    return mph + " mph";
  }
  function allowed(list, n) {
    var i;
    for (i = 0; i < list.length; i++) if (list[i] === n) return true;
    return false;
  }

  function bucket() {
    return state.mode === "trick" ? state.trick : state.slalom;
  }

  function slalomResult(tags) {
    var list = tags.slice().sort(byTime);
    var whole = 0;
    var seenFall = false;
    var counted = {};
    var why = {};
    var i;
    for (i = 0; i < list.length; i++) {
      var tag = list[i];
      if (tag.kind === "fall") {
        why[tag.id] = seenFall ? "already fallen" : "ends the pass";
        seenFall = true;
        continue;
      }
      if (tag.kind !== "buoy") continue;
      if (!seenFall && whole < 6) {
        whole += 1;
        counted[tag.id] = true;
        why[tag.id] = "counts";
      } else if (seenFall) why[tag.id] = "after the fall";
      else why[tag.id] = "over the cap of 6";
    }
    return { whole: whole, counted: counted, why: why };
  }

  function trickView(tags, skis) {
    var passes = [[], []];
    var sorted = tags.slice().sort(byTime);
    var i;
    for (i = 0; i < sorted.length; i++) {
      passes[sorted[i].pass === 1 ? 1 : 0].push(sorted[i]);
    }
    var empty = { items: [[], []], totals: [0, 0], total: 0 };
    if (!LT) return { scored: empty, byId: {}, ordered: sorted };
    var scored = LT.score(passes.map(function (list) {
      return list.map(function (tag) { return { code: tag.code, rev: !!tag.rev }; });
    }), skis === 2 ? 2 : 1);
    var byId = {};
    var p, j;
    for (p = 0; p < 2; p++) {
      for (j = 0; j < passes[p].length; j++) byId[passes[p][j].id] = scored.items[p][j];
    }
    return { scored: scored, byId: byId, ordered: sorted };
  }

  function currentTime() {
    var t = video.currentTime;
    if (!isFinite(t) || t < 0) return null;
    return round3(t);
  }

  function seek(t) {
    if (!isFinite(t)) return;
    try { video.currentTime = t; } catch (err) {}
    paintTime();
  }

  function paintTime() {
    $("rv-time").textContent = fmt(video.currentTime || 0);
    var scrub = $("rv-scrub");
    if (scrub === document.activeElement) return;
    if (isFinite(video.duration) && video.duration > 0) {
      scrub.value = String(Math.round((video.currentTime / video.duration) * 1000));
    }
  }

  function paintChips(container, values, current, labelFn, pick) {
    clear(container);
    values.forEach(function (value) {
      var on = value === current;
      var button = el("button", null, labelFn(value));
      button.type = "button";
      button.setAttribute("aria-pressed", on ? "true" : "false");
      button.addEventListener("click", function () { pick(value); });
      container.appendChild(button);
    });
  }

  function paintTrickSelect() {
    var sel = $("rv-trick-select");
    if (!LT) {
      clear(sel);
      return;
    }
    var previous = sel.value;
    clear(sel);
    var skis = state.trick.skis === 2 ? 2 : 1;
    LT.chart.forEach(function (row) {
      var basic = LT.value(row, false, skis);
      var rev = LT.value(row, true, skis);
      if (basic == null) return;
      var opt = el("option", null, row[0] + " · " + row[1] + " · " + basic + (rev == null ? "" : " / R " + rev));
      opt.value = row[0];
      sel.appendChild(opt);
    });
    if (previous && Object.prototype.hasOwnProperty.call(LT.byCode, previous)) {
      var still = false;
      var i;
      for (i = 0; i < sel.options.length; i++) if (sel.options[i].value === previous) still = true;
      if (still) sel.value = previous;
    }
  }

  function paintScore() {
    var score = $("rv-score");
    var sub = $("rv-sub");
    var kicker = $("rv-kicker");
    if (state.mode === "slalom") {
      var result = slalomResult(state.slalom.tags);
      var note = cleanText($("rv-partial").value, MAX_NOTE);
      kicker.textContent = "Buoys";
      score.textContent = String(result.whole);
      sub.textContent = "Before the fall, capped at 6 · " + lineLabel(state.slalom.off) + " · " + speedLabel(state.slalom.mph) + (note ? " · " + note : "");
      return result;
    }
    if (state.mode === "trick") {
      var view = trickView(state.trick.tags, state.trick.skis);
      kicker.textContent = "Points";
      score.textContent = LT ? String(view.scored.total) : "—";
      sub.textContent = LT
        ? ("Pass 1 · " + view.scored.totals[0] + " · Pass 2 · " + view.scored.totals[1])
        : "Trick chart did not load.";
      return view;
    }
    kicker.textContent = "Score";
    score.textContent = "—";
    sub.textContent = "Choose Slalom or Trick, then tag the run.";
    return null;
  }

  function paintTags() {
    var list = $("rv-list");
    var empty = $("rv-empty");
    clear(list);
    var tags = state.mode === "trick" ? state.trick.tags : (state.mode === "slalom" ? state.slalom.tags : []);
    var ordered = tags.slice().sort(byTime);
    empty.hidden = ordered.length > 0;
    if (!state.mode) empty.textContent = "Choose Slalom or Trick.";
    else if (state.mode === "slalom") empty.textContent = "No tags yet. Scrub to a moment, then tap Buoy or Fall/miss.";
    else empty.textContent = "No tags yet. Pick a trick, then tap Tag or Tag reverse.";

    var slalom = state.mode === "slalom" ? slalomResult(tags) : null;
    var tricks = state.mode === "trick" ? trickView(tags, state.trick.skis) : null;

    ordered.forEach(function (tag) {
      var li = el("li", "tag");
      var seekBtn = el("button", "tag-seek");
      seekBtn.type = "button";
      seekBtn.appendChild(el("span", "tag-time", fmt(tag.t)));
      var desc = "";
      if (tag.kind === "buoy" || tag.kind === "fall") {
        var label = tag.kind === "buoy" ? "Buoy" : "Fall/miss";
        desc = label + " · " + (slalom.why[tag.id] || "");
      } else if (tag.code) {
        var row = LT && Object.prototype.hasOwnProperty.call(LT.byCode, tag.code) ? LT.byCode[tag.code] : null;
        var res = tricks && tricks.byId[tag.id];
        var name = row ? ((tag.rev ? "Reverse " : "") + row[1]) : tag.code;
        desc = "Pass " + (tag.pass === 1 ? "2" : "1") + " · " + (tag.rev ? "R" : "") + tag.code + " · " + name;
        if (res) desc += res.why ? " · 0 · " + res.why : " · " + res.pts;
        if (res && res.why) li.className = "tag is-off";
      }
      if ((tag.kind === "buoy" && slalom && !slalom.counted[tag.id]) || (tag.kind === "fall" && slalom && slalom.why[tag.id] === "already fallen")) {
        li.className = "tag is-off";
      }
      seekBtn.appendChild(el("span", "tag-desc", desc));
      seekBtn.setAttribute("aria-label", fmt(tag.t) + " " + desc + ". Seek");
      seekBtn.setAttribute("data-seek", tag.id);
      var del = el("button", "tag-x", "×");
      del.type = "button";
      del.setAttribute("aria-label", "Delete tag at " + fmt(tag.t));
      del.setAttribute("data-del", tag.id);
      li.appendChild(seekBtn);
      li.appendChild(del);
      list.appendChild(li);
    });
  }

  function paintUndo() {
    var undo = state.mode ? bucket().undo : [];
    $("rv-undo").disabled = !undo.length;
  }

  function paintSave() {
    var tags = state.mode ? bucket().tags : [];
    $("rv-save").disabled = !(state.ready && state.fileName && state.mode && tags.length);
  }

  function paintModes() {
    $("rv-mode-slalom").setAttribute("aria-pressed", state.mode === "slalom" ? "true" : "false");
    $("rv-mode-trick").setAttribute("aria-pressed", state.mode === "trick" ? "true" : "false");
    $("rv-slalom").hidden = state.mode !== "slalom";
    $("rv-trick").hidden = state.mode !== "trick";
    $("rv-ski-1").setAttribute("aria-pressed", state.trick.skis === 1 ? "true" : "false");
    $("rv-ski-2").setAttribute("aria-pressed", state.trick.skis === 2 ? "true" : "false");
    $("rv-pass-0").setAttribute("aria-pressed", state.trick.pass === 0 ? "true" : "false");
    $("rv-pass-1").setAttribute("aria-pressed", state.trick.pass === 1 ? "true" : "false");
  }

  function paint() {
    state.units = readUnits();
    $("rv-filename").textContent = state.fileName ? state.fileName + (state.duration ? " · " + fmt(state.duration) : "") : "";
    paintModes();
    if (state.mode === "slalom") {
      paintChips($("rv-lines"), OFFS, state.slalom.off, lineLabel, function (off) {
        state.slalom.off = off;
        paint();
      });
      paintChips($("rv-speeds"), MPHS, state.slalom.mph, speedLabel, function (mph) {
        state.slalom.mph = mph;
        paint();
      });
    }
    paintScore();
    paintTags();
    paintUndo();
    paintSave();
    paintRuns();
  }

  function addTag(tag) {
    var box = bucket();
    if (!state.mode) {
      setStatus("Choose Slalom or Trick first.");
      return;
    }
    if (!state.ready) {
      setStatus("Wait for the video to load.");
      return;
    }
    if (box.tags.length >= MAX_TAGS) {
      setStatus("This run already has " + MAX_TAGS + " tags.");
      return;
    }
    box.tags.push(tag);
    box.undo.push({ type: "add", id: tag.id });
    if (box.undo.length > MAX_UNDO) box.undo.shift();
    setStatus("");
    paint();
  }

  function tagSlalom(kind) {
    var t = currentTime();
    if (t == null) return;
    addTag({ id: newId("tg"), t: t, n: state.seq, kind: kind });
  }

  function tagTrick(rev) {
    if (!LT) {
      setStatus("Trick chart did not load.");
      return;
    }
    var code = $("rv-trick-select").value;
    if (!Object.prototype.hasOwnProperty.call(LT.byCode, code)) return;
    var t = currentTime();
    if (t == null) return;
    addTag({
      id: newId("tg"),
      t: t,
      n: state.seq,
      pass: state.trick.pass === 1 ? 1 : 0,
      code: code,
      rev: !!rev
    });
  }

  function removeTag(id, record) {
    var box = bucket();
    var i;
    for (i = 0; i < box.tags.length; i++) {
      if (box.tags[i].id === id) {
        var removed = box.tags.splice(i, 1)[0];
        if (record) {
          box.undo.push({ type: "delete", tag: removed });
          if (box.undo.length > MAX_UNDO) box.undo.shift();
        }
        paint();
        return;
      }
    }
  }

  function undo() {
    if (!state.mode) return;
    var box = bucket();
    var step = box.undo.pop();
    if (!step) return;
    if (step.type === "add") removeTag(step.id, false);
    else if (step.type === "delete" && step.tag) {
      box.tags.push(step.tag);
      paint();
    }
  }

  function copyTag(tag) {
    var out = { id: String(tag.id || ""), t: tag.t, n: tag.n || 0 };
    if (tag.kind === "buoy" || tag.kind === "fall") out.kind = tag.kind;
    if (typeof tag.code === "string") out.code = tag.code;
    if (tag.pass === 0 || tag.pass === 1) out.pass = tag.pass;
    out.rev = !!tag.rev;
    return out;
  }

  function validTag(tag, kind) {
    if (!tag || typeof tag !== "object") return null;
    var t = typeof tag.t === "number" ? tag.t : parseFloat(tag.t);
    if (!isFinite(t) || t < 0 || t > MAX_DURATION) return null;
    var out = { id: cleanText(tag.id, 40) || newId("tg"), t: round3(t), n: isFinite(tag.n) ? tag.n : 0 };
    if (kind === "slalom") {
      if (tag.kind !== "buoy" && tag.kind !== "fall") return null;
      out.kind = tag.kind;
      return out;
    }
    if (!LT || typeof tag.code !== "string" || !Object.prototype.hasOwnProperty.call(LT.byCode, tag.code)) return null;
    out.code = tag.code;
    out.pass = tag.pass === 1 ? 1 : 0;
    out.rev = !!tag.rev;
    return out;
  }

  function validRun(row) {
    if (!row || typeof row !== "object") return null;
    if (row.kind !== "slalom" && row.kind !== "trick") return null;
    var name = cleanText(row.fileName, MAX_NAME);
    if (!name) return null;
    var duration = typeof row.duration === "number" ? row.duration : parseFloat(row.duration);
    if (!isFinite(duration) || duration < 0 || duration > MAX_DURATION) return null;
    if (!Array.isArray(row.tags)) return null;
    var tags = [];
    var i;
    for (i = 0; i < row.tags.length && tags.length < MAX_TAGS; i++) {
      var tag = validTag(row.tags[i], row.kind);
      if (tag) tags.push(tag);
    }
    var run = {
      id: cleanText(row.id, 40) || newId("rv"),
      at: isFinite(row.at) ? row.at : Date.now(),
      kind: row.kind,
      fileName: name,
      duration: round3(duration),
      tags: tags
    };
    if (row.kind === "slalom") {
      var off = parseInt(row.off, 10);
      var mph = parseInt(row.mph, 10);
      if (!allowed(OFFS, off) || !allowed(MPHS, mph)) return null;
      var result = slalomResult(tags);
      run.off = off;
      run.mph = mph;
      run.buoys = result.whole;
      run.partialNote = cleanText(row.partialNote, MAX_NOTE);
      run.setId = cleanText(row.setId, 40);
      run.score = result.whole;
    } else {
      run.skis = row.skis === 2 ? 2 : 1;
      run.score = trickView(tags, run.skis).scored.total;
    }
    return run;
  }

  function loadRuns() {
    try {
      var raw = localStorage.getItem(RUN_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      var out = [];
      var i;
      for (i = 0; i < parsed.length && out.length < MAX_RUNS; i++) {
        var run = validRun(parsed[i]);
        if (run && run.tags.length) out.push(run);
      }
      return out;
    } catch (err) {
      return [];
    }
  }

  function saveRuns(runs) {
    try {
      localStorage.setItem(RUN_KEY, JSON.stringify(runs.slice(0, MAX_RUNS)));
      return true;
    } catch (err) {
      return false;
    }
  }

  function runTitle(run) {
    var when = "";
    var d = new Date(run.at);
    if (!isNaN(d.getTime())) when = d.toLocaleDateString() + " · ";
    if (run.kind === "slalom") {
      var n = slalomResult(run.tags).whole;
      return when + "Slalom · " + n + (n === 1 ? " buoy · " : " buoys · ") + lineLabel(run.off) + " · " + speedLabel(run.mph) + " · " + run.fileName;
    }
    var pts = trickView(run.tags, run.skis).scored.total;
    return when + "Trick · " + pts + " pts · " + run.skis + (run.skis === 1 ? " ski · " : " skis · ") + run.fileName;
  }

  function paintRuns() {
    var list = $("rv-runs");
    var empty = $("rv-runs-empty");
    var runs = loadRuns();
    clear(list);
    empty.hidden = runs.length > 0;
    runs.forEach(function (run) {
      var li = el("li", "run");
      var copy = el("div", "run-copy");
      copy.appendChild(el("p", "run-title", runTitle(run)));
      if (run.kind === "slalom" && run.partialNote) copy.appendChild(el("p", "run-note", run.partialNote));
      var del = el("button", "run-x", "×");
      del.type = "button";
      del.setAttribute("aria-label", "Delete this tagged run");
      del.setAttribute("data-run", run.id);
      li.appendChild(copy);
      li.appendChild(del);
      list.appendChild(li);
    });
  }

  function blankPerson(off, mph) {
    return {
      id: "p1",
      name: "",
      selectedPass: { off: off, mph: mph },
      slalomSets: [],
      sports: { kneeboard: { customs: [], tricks: {} }, slalom: { customs: [], tricks: {} } },
      score: 0,
      trophies: [],
      hasMedia: false
    };
  }

  function guestStateFrom(parsed, off, mph) {
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    if (Array.isArray(parsed.people)) return parsed;
    if (Array.isArray(parsed.slalomSets) || typeof parsed.personName === "string" || parsed.selectedPass || parsed.workingPass) {
      var pass = parsed.selectedPass && typeof parsed.selectedPass === "object"
        ? parsed.selectedPass
        : (parsed.workingPass && typeof parsed.workingPass === "object" ? parsed.workingPass : { off: off, mph: mph });
      return {
        club: "Ski Paradise Cleveland",
        units: parsed.units === "kph" ? "kph" : "mph",
        people: [{
          id: "p1",
          name: typeof parsed.personName === "string" ? parsed.personName : "",
          selectedPass: pass,
          slalomSets: Array.isArray(parsed.slalomSets) ? parsed.slalomSets : [],
          sports: parsed.sports && typeof parsed.sports === "object" ? parsed.sports : blankPerson(off, mph).sports,
          score: typeof parsed.score === "number" ? parsed.score : 0,
          trophies: Array.isArray(parsed.trophies) ? parsed.trophies : [],
          hasMedia: parsed.hasMedia === true
        }],
        currentPersonId: "p1",
        seedGen: typeof parsed.seedGen === "string" ? parsed.seedGen : ""
      };
    }
    return null;
  }

  function currentGuest(stateObj, off, mph) {
    if (!Array.isArray(stateObj.people)) stateObj.people = [];
    var people = stateObj.people;
    var i;
    for (i = 0; i < people.length; i++) {
      if (people[i] && typeof people[i] === "object" && people[i].id === stateObj.currentPersonId) return people[i];
    }
    for (i = 0; i < people.length; i++) {
      if (people[i] && typeof people[i] === "object" && typeof people[i].id === "string") {
        stateObj.currentPersonId = people[i].id;
        return people[i];
      }
    }
    var person = blankPerson(off, mph);
    people.push(person);
    stateObj.currentPersonId = person.id;
    return person;
  }

  function appendGuestSet(set) {
    try {
      var raw = localStorage.getItem(GUEST_KEY);
      var parsed = raw ? JSON.parse(raw) : {
        club: "Ski Paradise Cleveland",
        units: "mph",
        people: [],
        currentPersonId: "p1",
        seedGen: "invite-only-1"
      };
      var guest = raw ? guestStateFrom(parsed, set.off, set.mph) : parsed;
      if (!guest) return false;
      var person = currentGuest(guest, set.off, set.mph);
      if (!person || typeof person !== "object") return false;
      if (!Array.isArray(person.slalomSets)) person.slalomSets = [];
      var sets = [];
      var i;
      for (i = 0; i < person.slalomSets.length; i++) {
        if (person.slalomSets[i] && typeof person.slalomSets[i] === "object") sets.push(person.slalomSets[i]);
      }
      sets.unshift(set);
      person.slalomSets = sets.slice(0, MAX_SETS);
      if (!person.selectedPass || typeof person.selectedPass !== "object") person.selectedPass = { off: set.off, mph: set.mph };
      else {
        person.selectedPass.off = set.off;
        person.selectedPass.mph = set.mph;
      }
      localStorage.setItem(GUEST_KEY, JSON.stringify(guest));
      return true;
    } catch (err) {
      return false;
    }
  }

  function removeGuestSet(setId) {
    if (!setId) return;
    try {
      var raw = localStorage.getItem(GUEST_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.people)) return;
      var i, j;
      for (i = 0; i < parsed.people.length; i++) {
        var person = parsed.people[i];
        if (!person || !Array.isArray(person.slalomSets)) continue;
        var next = [];
        for (j = 0; j < person.slalomSets.length; j++) {
          var row = person.slalomSets[j];
          if (row && row.id === setId) continue;
          next.push(row);
        }
        person.slalomSets = next;
      }
      localStorage.setItem(GUEST_KEY, JSON.stringify(parsed));
    } catch (err) {}
  }

  function trickPasses(tags) {
    var passes = [[], []];
    tags.slice().sort(byTime).forEach(function (tag) {
      passes[tag.pass === 1 ? 1 : 0].push({ code: tag.code, rev: !!tag.rev });
    });
    return passes;
  }

  function appendTrickRun(run, passes) {
    try {
      var raw = localStorage.getItem(TRICK_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return false;
      var kept = [];
      var i;
      for (i = 0; i < parsed.length; i++) {
        if (parsed[i] && typeof parsed[i] === "object") kept.push(parsed[i]);
      }
      kept = kept.slice(0, MAX_TRICK_RUNS - 1);
      kept.unshift({ id: run.id, at: run.at, skis: run.skis, passes: passes });
      localStorage.setItem(TRICK_KEY, JSON.stringify(kept.slice(0, MAX_TRICK_RUNS)));
      return true;
    } catch (err) {
      return false;
    }
  }

  function removeTrickRun(id) {
    if (!id) return;
    try {
      var raw = localStorage.getItem(TRICK_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      var next = [];
      var i;
      for (i = 0; i < parsed.length; i++) {
        if (parsed[i] && parsed[i].id === id) continue;
        if (parsed[i] && typeof parsed[i] === "object") next.push(parsed[i]);
      }
      localStorage.setItem(TRICK_KEY, JSON.stringify(next.slice(0, MAX_TRICK_RUNS)));
    } catch (err) {}
  }

  function saveRun() {
    if (!state.fileName || !state.mode) return;
    var tags = bucket().tags.map(copyTag);
    if (!tags.length) return;
    var run = {
      id: newId("rv"),
      at: Date.now(),
      kind: state.mode,
      fileName: state.fileName,
      duration: state.duration,
      tags: tags
    };
    var note = "";
    if (state.mode === "slalom") {
      var result = slalomResult(tags);
      run.off = state.slalom.off;
      run.mph = state.slalom.mph;
      run.buoys = result.whole;
      run.partialNote = cleanText($("rv-partial").value, MAX_NOTE);
      run.score = result.whole;
      run.setId = "";
      note = run.partialNote;
      if (result.whole >= 1 && result.whole <= 6) {
        run.setId = newId("set");
        var wrote = appendGuestSet({
          id: run.setId,
          date: todayISO(),
          off: run.off,
          mph: run.mph,
          buoys: result.whole
        });
        if (!wrote) run.setId = "";
      }
    } else {
      run.skis = state.trick.skis === 2 ? 2 : 1;
      run.score = trickView(tags, run.skis).scored.total;
      var passes = trickPasses(tags);
      if (!appendTrickRun(run, passes)) note = "trick-log-failed";
    }
    var runs = loadRuns();
    var clean = validRun(run);
    if (!clean) {
      setStatus("Could not save this run.");
      return;
    }
    runs.unshift(clean);
    if (!saveRuns(runs)) {
      if (clean.setId) removeGuestSet(clean.setId);
      if (clean.kind === "trick") removeTrickRun(clean.id);
      setStatus("Could not save on this device.");
      return;
    }
    if (state.mode === "slalom") {
      if (clean.buoys < 1) setStatus("Saved the tags on this device. A pass with no buoy is not added to the slalom log.");
      else if (!clean.setId) setStatus("Saved the tags on this device. The slalom log could not be updated.");
      else setStatus("Saved on this device. " + clean.buoys + (clean.buoys === 1 ? " buoy at " : " buoys at ") + lineLabel(clean.off) + ", " + speedLabel(clean.mph) + " is in your slalom log.");
    } else if (note === "trick-log-failed") {
      setStatus("Saved the tags on this device. The trick log could not be updated.");
    } else {
      setStatus("Saved on this device. " + clean.score + " pts is in your trick log.");
    }
    paintRuns();
  }

  function deleteRun(id) {
    var runs = loadRuns();
    var next = [];
    var i;
    for (i = 0; i < runs.length; i++) {
      if (runs[i].id === id) {
        if (runs[i].kind === "slalom") removeGuestSet(runs[i].setId);
        if (runs[i].kind === "trick") removeTrickRun(runs[i].id);
        continue;
      }
      next.push(runs[i]);
    }
    saveRuns(next);
    paintRuns();
  }

  function onFile(file) {
    if (!file) return;
    var type = file.type || "";
    if (type && type.indexOf("video/") !== 0) {
      setStatus("Choose a video file.");
      return;
    }
    if (state.url) URL.revokeObjectURL(state.url);
    state.url = URL.createObjectURL(file);
    state.fileName = cleanText(file.name, MAX_NAME) || "video";
    state.duration = 0;
    state.ready = false;
    state.slalom.tags = [];
    state.slalom.undo = [];
    state.trick.tags = [];
    state.trick.undo = [];
    $("rv-partial").value = "";
    video.src = state.url;
    video.load();
    stage.hidden = false;
    setStatus("");
    paint();
  }

  fileInput.addEventListener("change", function () {
    var file = fileInput.files && fileInput.files[0];
    onFile(file);
  });

  video.addEventListener("loadedmetadata", function () {
    state.ready = true;
    state.duration = isFinite(video.duration) && video.duration > 0 && video.duration <= MAX_DURATION ? round3(video.duration) : 0;
    paintTime();
    paint();
  });
  video.addEventListener("timeupdate", paintTime);
  video.addEventListener("play", function () { $("rv-play").textContent = "Pause"; });
  video.addEventListener("pause", function () { $("rv-play").textContent = "Play"; });
  video.addEventListener("ended", function () { $("rv-play").textContent = "Play"; });
  video.addEventListener("error", function () {
    setStatus("This video could not be played on this device.");
  });

  $("rv-play").addEventListener("click", function () {
    if (video.paused) {
      var pending = video.play();
      if (pending && typeof pending.catch === "function") pending.catch(function () {});
    } else video.pause();
  });
  $("rv-back").addEventListener("click", function () { seek(Math.max(0, (video.currentTime || 0) - STEP)); });
  $("rv-fwd").addEventListener("click", function () {
    var dur = isFinite(video.duration) ? video.duration : MAX_DURATION;
    seek(Math.min(dur, (video.currentTime || 0) + STEP));
  });
  $("rv-scrub").addEventListener("input", function () {
    if (!isFinite(video.duration) || video.duration <= 0) return;
    seek((Number($("rv-scrub").value) / 1000) * video.duration);
  });

  $("rv-mode-slalom").addEventListener("click", function () { state.mode = "slalom"; setStatus(""); paint(); });
  $("rv-mode-trick").addEventListener("click", function () { state.mode = "trick"; setStatus(""); paint(); });
  $("rv-buoy").addEventListener("click", function () { tagSlalom("buoy"); });
  $("rv-fall").addEventListener("click", function () { tagSlalom("fall"); });
  $("rv-ski-1").addEventListener("click", function () { state.trick.skis = 1; paintTrickSelect(); paint(); });
  $("rv-ski-2").addEventListener("click", function () { state.trick.skis = 2; paintTrickSelect(); paint(); });
  $("rv-pass-0").addEventListener("click", function () { state.trick.pass = 0; paint(); });
  $("rv-pass-1").addEventListener("click", function () { state.trick.pass = 1; paint(); });
  $("rv-tag").addEventListener("click", function () { tagTrick(false); });
  $("rv-tag-rev").addEventListener("click", function () { tagTrick(true); });
  $("rv-undo").addEventListener("click", undo);
  $("rv-save").addEventListener("click", saveRun);
  $("rv-partial").addEventListener("input", function () {
    state.slalom.note = cleanText($("rv-partial").value, MAX_NOTE);
    if (state.mode === "slalom") paintScore();
  });

  $("rv-list").addEventListener("click", function (ev) {
    var node = ev.target;
    while (node && node !== $("rv-list")) {
      if (node.getAttribute && node.getAttribute("data-seek")) {
        var id = node.getAttribute("data-seek");
        var tags = bucket().tags;
        var i;
        for (i = 0; i < tags.length; i++) if (tags[i].id === id) seek(tags[i].t);
        return;
      }
      if (node.getAttribute && node.getAttribute("data-del")) {
        removeTag(node.getAttribute("data-del"), true);
        return;
      }
      node = node.parentNode;
    }
  });

  $("rv-runs").addEventListener("click", function (ev) {
    var node = ev.target;
    while (node && node !== $("rv-runs")) {
      if (node.getAttribute && node.getAttribute("data-run")) {
        deleteRun(node.getAttribute("data-run"));
        return;
      }
      node = node.parentNode;
    }
  });

  window.addEventListener("pagehide", function () {
    if (state.url) URL.revokeObjectURL(state.url);
  });

  paintTrickSelect();
  paintRuns();
})();
