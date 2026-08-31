(function () {
  "use strict";

  var STORAGE_KEY = "nrs-ski-lake-tricks-v2" + (window.LAKE_USER_ID ? "-" + window.LAKE_USER_ID : "");
  var CLUB = "Ski Paradise Ohio";
  var IDB_NAME = "nrs-ski-lake-tricks-v2";
  var IDB_STORE = "media";

  var KNEEBOARD = [
    { id: "kb-s360-r", name: "Surface 360 right", mode: "easy" },
    { id: "kb-s360-l", name: "Surface 360 left", mode: "easy" },
    { id: "kb-s360-ftf", name: "Surface 360 front-to-front", mode: "easy" },
    { id: "kb-s180", name: "Surface 180", mode: "easy" },
    { id: "kb-wrap", name: "Surface wrap", mode: "easy" },
    { id: "kb-ollie", name: "Ollie", mode: "easy" },
    { id: "kb-tumble", name: "Tumble turn", mode: "easy" },
    { id: "kb-s360-rev", name: "Surface 360 reverse", mode: "easy" },
    { id: "kb-s180-rev", name: "Surface 180 reverse", mode: "easy" },
    { id: "kb-w180", name: "Wake 180", mode: "easy" },
    { id: "kb-w180-rev", name: "Wake 180 reverse", mode: "easy" },
    { id: "kb-roll-l", name: "Basic roll left", mode: "easy" },
    { id: "kb-roll-r", name: "Basic roll right", mode: "easy" },
    { id: "kb-heli", name: "Heli (wake 360, handle pass)", mode: "hard" },
    { id: "kb-w360", name: "Wake 360", mode: "hard" },
    { id: "kb-s540", name: "Surface 540", mode: "hard" },
    { id: "kb-s720", name: "Surface 720", mode: "hard" },
    { id: "kb-backroll", name: "Backroll", mode: "hard" },
    { id: "kb-frontflip", name: "Front flip", mode: "hard" },
    { id: "kb-w540", name: "Wake 540", mode: "hard" },
    { id: "kb-hflip", name: "Handle flip", mode: "hard" }
  ];

  var CATALOGS = { kneeboard: KNEEBOARD };

  var SLALOM_OFFS = [15, 22, 28, 32];
  var SLALOM_MPHS = [28, 30, 32, 34, 36];
  var LINE_METERS = { 0: "23 m", 15: "18.25 m", 22: "16 m", 28: "14.25 m", 32: "13 m" };
  var MPH_TO_KPH = { 28: 46, 30: 49, 32: 52, 34: 55, 36: 58 };
  var BUOY_OPTIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];
  var DEFAULT_PASS = { off: 15, mph: 28 };

  var SEED_GEN = "ski-paradise-ohio-1";

  /* Ski Paradise Ohio roster — real members, empty logs. Tagged seed:true so a reload does not duplicate. */
  var SEED_SKIERS = [
    { id: "seed-greg-alber", name: "Greg Alber", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-judy-beckenbach", name: "Judy Beckenbach", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-shannon-cochrane", name: "Shannon Cochrane", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-tim-cochrane", name: "Tim Cochrane", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-nancy-dadas", name: "Nancy Dadas", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-nick-dadas", name: "Nick Dadas", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-teri-fetherolf", name: "Teri Fetherolf", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-jackie-frilling", name: "Jackie Frilling", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-travis-frilling", name: "Travis Frilling", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-julie-gray", name: "Julie Gray", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-troy-gray", name: "Troy Gray", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-joe-guinter", name: "Joe Guinter", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-michelle-guinter", name: "Michelle Guinter", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-agata-hageman", name: "Agata Hageman", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-joel-hageman", name: "Joel Hageman", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-jeff-hastings", name: "Jeff Hastings", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-jenny-hohman", name: "Jenny Hohman", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-lewie-hohman", name: "Lewie Hohman", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-deborah-logan", name: "Deborah Logan", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-justin-logan", name: "Justin Logan", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-michelle-loufman", name: "Michelle Loufman", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-mike-loufman", name: "Mike Loufman", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-don-lydon", name: "Don Lydon", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-jackie-matus", name: "Jackie Matus", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-mike-nichols", name: "Mike Nichols", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-doug-poe", name: "Doug Poe", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-joel-rathbun", name: "Joel Rathbun", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-mary-ellen-voiers", name: "Mary Ellen Voiers", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-rick-voiers", name: "Rick Voiers", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-rm-voiers", name: "RM Voiers", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-brad-way", name: "Brad Way", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-laura-way", name: "Laura Way", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-laura-zangmeister", name: "Laura Zangmeister", selectedPass: { off: 15, mph: 28 }, slalomSets: [] },
    { id: "seed-steve-zangmeister", name: "Steve Zangmeister", selectedPass: { off: 15, mph: 28 }, slalomSets: [] }
  ];

  var TROPHY_DEFS = [
    { id: "first-trick", title: "First trick" },
    { id: "first-hard", title: "First hard trick" },
    { id: "first-heli", title: "First heli" },
    { id: "five-hard", title: "Five lands of one hard trick" },
    { id: "first-media", title: "First clip or photo" },
    { id: "lake-opener", title: "Lake opener" }
  ];

  function emptySport() {
    return { customs: [], tricks: {} };
  }

  function newPersonId() {
    return "p" + Date.now() + "-" + Math.floor(Math.random() * 1e6);
  }

  function emptyPerson(id, name) {
    return {
      id: id || newPersonId(),
      name: typeof name === "string" ? name : "",
      selectedPass: { off: DEFAULT_PASS.off, mph: DEFAULT_PASS.mph },
      slalomSets: [],
      sports: {
        kneeboard: emptySport(),
        slalom: emptySport()
      },
      score: 0,
      trophies: [],
      hasMedia: false
    };
  }

  function emptyState() {
    var p = emptyPerson("p1", "");
    return {
      club: CLUB,
      units: "mph",
      people: [p],
      currentPersonId: p.id,
      seedGen: ""
    };
  }

  function makeSeedPerson(spec) {
    var p = emptyPerson(spec.id, spec.name);
    p.seed = true;
    var pass = spec.selectedPass && typeof spec.selectedPass === "object" ? spec.selectedPass : {};
    p.selectedPass = normalizePass(pass.off, pass.mph);
    p.slalomSets = normalizeSets(spec.slalomSets);
    p.score = 0;
    p.trophies = [];
    return p;
  }

  function hasSeedPeople(people) {
    if (!Array.isArray(people)) return false;
    var i;
    for (i = 0; i < people.length; i++) {
      if (people[i] && people[i].seed === true) return true;
    }
    return false;
  }

  function ensureSeedSkiers() {
    if (!state || !Array.isArray(state.people)) return;
    var changed = false;
    var i;
    var j;
    if (state.seedGen !== SEED_GEN) {
      var kept = [];
      for (i = 0; i < state.people.length; i++) {
        if (state.people[i] && state.people[i].seed === true) continue;
        kept.push(state.people[i]);
      }
      if (!kept.length) {
        kept = [emptyPerson("p1", "")];
      }
      state.people = kept;
      var found = false;
      for (i = 0; i < kept.length; i++) {
        if (kept[i].id === state.currentPersonId) {
          found = true;
          break;
        }
      }
      if (!found) state.currentPersonId = kept[0].id;
      state.seedGen = SEED_GEN;
      changed = true;
    } else if (hasSeedPeople(state.people)) {
      return;
    }
    for (i = 0; i < SEED_SKIERS.length; i++) {
      var spec = SEED_SKIERS[i];
      var exists = false;
      for (j = 0; j < state.people.length; j++) {
        if (state.people[j].id === spec.id) {
          exists = true;
          break;
        }
      }
      if (exists) continue;
      if (nameTaken(spec.name)) continue;
      state.people.push(makeSeedPerson(spec));
      changed = true;
    }
    if (changed) save(state);
  }

  function copySport(src) {
    var out = emptySport();
    if (!src || typeof src !== "object") return out;
    if (Array.isArray(src.customs)) out.customs = src.customs;
    if (src.tricks && typeof src.tricks === "object") out.tricks = src.tricks;
    return out;
  }

  function copyTrophies(src) {
    if (!Array.isArray(src)) return [];
    return src.filter(function (t) {
      return t && typeof t === "object" && typeof t.id === "string" && typeof t.title === "string";
    }).map(function (t) {
      return {
        id: t.id,
        title: t.title,
        earned: typeof t.earned === "string" ? t.earned : todayISO()
      };
    });
  }

  function applyPassAndSets(person, src) {
    if (src.selectedPass && typeof src.selectedPass === "object") {
      person.selectedPass = normalizePass(src.selectedPass.off, src.selectedPass.mph);
    } else if (src.workingPass && typeof src.workingPass === "object") {
      person.selectedPass = normalizePass(src.workingPass.off, src.workingPass.mph);
    }
    if (Array.isArray(src.slalomSets)) {
      person.slalomSets = normalizeSets(src.slalomSets);
    } else if (src.slalomPasses && typeof src.slalomPasses === "object") {
      person.slalomSets = migratePasses(src.slalomPasses);
    }
  }

  function hydratePerson(src, fallbackId) {
    if (!src || typeof src !== "object") return null;
    var id = typeof src.id === "string" && src.id ? src.id : (fallbackId || newPersonId());
    var p = emptyPerson(id, typeof src.name === "string" ? src.name : "");
    applyPassAndSets(p, src);
    if (src.sports && typeof src.sports === "object") {
      p.sports.kneeboard = copySport(src.sports.kneeboard);
      p.sports.slalom = copySport(src.sports.slalom);
    }
    p.trophies = copyTrophies(src.trophies);
    if (src.hasMedia === true) p.hasMedia = true;
    if (typeof src.score === "number") p.score = src.score;
    if (src.seed === true) p.seed = true;
    return p;
  }

  function migrateFlatPerson(parsed) {
    var p = emptyPerson("p1", typeof parsed.personName === "string" ? parsed.personName : "");
    applyPassAndSets(p, parsed);
    if (parsed.sports && typeof parsed.sports === "object") {
      p.sports.kneeboard = copySport(parsed.sports.kneeboard);
      p.sports.slalom = copySport(parsed.sports.slalom);
    }
    p.trophies = copyTrophies(parsed.trophies);
    if (parsed.hasMedia === true) p.hasMedia = true;
    if (typeof parsed.score === "number") p.score = parsed.score;
    return p;
  }

  function load() {
    var base = emptyState();
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return base;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return base;
      if (parsed.units === "kph" || parsed.units === "mph") base.units = parsed.units;
      base.club = CLUB;
      if (typeof parsed.seedGen === "string") base.seedGen = parsed.seedGen;
      if (Array.isArray(parsed.people) && parsed.people.length) {
        var people = [];
        var i;
        for (i = 0; i < parsed.people.length; i++) {
          var hp = hydratePerson(parsed.people[i], "p" + (i + 1));
          if (hp) people.push(hp);
        }
        if (!people.length) return base;
        base.people = people;
        var cur = parsed.currentPersonId;
        var found = false;
        for (i = 0; i < people.length; i++) {
          if (people[i].id === cur) {
            found = true;
            break;
          }
        }
        base.currentPersonId = found ? cur : people[0].id;
        return base;
      }
      base.people = [migrateFlatPerson(parsed)];
      base.currentPersonId = "p1";
      return base;
    } catch (err) {
      return emptyState();
    }
  }

  function save(next) {
    next.club = CLUB;
    next.units = next.units === "kph" ? "kph" : "mph";
    if (!Array.isArray(next.people) || !next.people.length) {
      var fresh = emptyPerson("p1", "");
      next.people = [fresh];
      next.currentPersonId = fresh.id;
    }
    var i;
    for (i = 0; i < next.people.length; i++) {
      var p = next.people[i];
      p.selectedPass = normalizePass(p.selectedPass && p.selectedPass.off, p.selectedPass && p.selectedPass.mph);
      p.slalomSets = normalizeSets(p.slalomSets || []);
    }
    var cur = currentPerson();
    if (cur) cur.score = computeScore();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      club: next.club,
      units: next.units,
      people: next.people,
      currentPersonId: next.currentPersonId,
      seedGen: next.seedGen || ""
    }));
  }

  function currentPerson() {
    var people = (state && state.people) || [];
    var id = state && state.currentPersonId;
    var i;
    for (i = 0; i < people.length; i++) {
      if (people[i].id === id) return people[i];
    }
    if (people.length) {
      state.currentPersonId = people[0].id;
      return people[0];
    }
    var p = emptyPerson("p1", "");
    state.people = [p];
    state.currentPersonId = p.id;
    return p;
  }

  function personNameOf(person) {
    var n = person && typeof person.name === "string" ? person.name : "";
    n = n.replace(/\s+/g, " ").trim();
    return n;
  }

  function displayName(person) {
    return personNameOf(person) || "Unnamed";
  }

  function nameTaken(name, exceptId) {
    var n = String(name || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (!n) return false;
    var people = state.people || [];
    var i;
    for (i = 0; i < people.length; i++) {
      if (exceptId && people[i].id === exceptId) continue;
      if (personNameOf(people[i]).toLowerCase() === n) return true;
    }
    return false;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function padNum(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + padNum(d.getMonth() + 1) + "-" + padNum(d.getDate());
  }

  function prettyDate(iso) {
    if (!iso || typeof iso !== "string") return "";
    var p = iso.split("-");
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var m = parseInt(p[1], 10);
    var day = parseInt(p[2], 10);
    if (!m || !day || !p[0]) return iso;
    return months[m - 1] + " " + day + ", " + p[0];
  }

  function prettyDateShort(iso) {
    if (!iso || typeof iso !== "string") return "";
    var p = iso.split("-");
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var m = parseInt(p[1], 10);
    var day = parseInt(p[2], 10);
    if (!m || !day || !p[0]) return iso;
    return months[m - 1] + " " + day;
  }

  function minISO(a, b) {
    if (!a) return b || null;
    if (!b) return a;
    return a < b ? a : b;
  }

  function itemsFor(sport) {
    var cat = CATALOGS[sport] || [];
    var p = currentPerson();
    var bag = p && p.sports && p.sports[sport];
    return cat.concat((bag && bag.customs) || []);
  }

  function findItem(sport, id) {
    var items = itemsFor(sport);
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  function defaultMode(sport, id) {
    var item = findItem(sport, id);
    return item && item.mode === "hard" ? "hard" : "easy";
  }

  function blankEntry(mode) {
    return { mode: mode === "hard" ? "hard" : "easy", firstDate: null, dates: [], count: 0 };
  }

  function getEntry(sport, id) {
    var p = currentPerson();
    if (!p || !p.sports[sport] || !p.sports[sport].tricks) return null;
    return p.sports[sport].tricks[id] || null;
  }

  function ensureEntry(sport, id) {
    var p = currentPerson();
    if (!p.sports[sport]) p.sports[sport] = emptySport();
    var bag = p.sports[sport].tricks;
    if (!bag[id]) bag[id] = blankEntry(defaultMode(sport, id));
    if (!Array.isArray(bag[id].dates)) bag[id].dates = [];
    if (typeof bag[id].count !== "number") bag[id].count = bag[id].dates.length;
    if (bag[id].mode !== "hard") bag[id].mode = "easy";
    return bag[id];
  }

  function modeOf(sport, id) {
    var entry = getEntry(sport, id);
    if (entry && (entry.mode === "hard" || entry.mode === "easy")) return entry.mode;
    return defaultMode(sport, id);
  }

  function isLanded(entry) {
    return !!(entry && entry.firstDate);
  }

  function landCount(entry) {
    if (!entry) return 0;
    if (typeof entry.count === "number" && entry.count > 0) return entry.count;
    if (entry.dates && entry.dates.length) return entry.dates.length;
    return isLanded(entry) ? 1 : 0;
  }

  function landNow(entry) {
    var day = todayISO();
    entry.firstDate = day;
    entry.dates = [day];
    entry.count = 1;
  }

  function clearLand(entry) {
    entry.firstDate = null;
    entry.dates = [];
    entry.count = 0;
  }

  function syncCount(entry) {
    entry.count = entry.dates.length;
    entry.firstDate = entry.dates.length ? entry.dates[0] : null;
  }

  /* ---- slalom: best of the set (canonical { off, mph }) ---- */

  function normalizePass(off, mph) {
    off = parseInt(off, 10);
    mph = parseInt(mph, 10);
    if (SLALOM_OFFS.indexOf(off) < 0) off = DEFAULT_PASS.off;
    if (SLALOM_MPHS.indexOf(mph) < 0) mph = DEFAULT_PASS.mph;
    return { off: off, mph: mph };
  }

  function parseBuoys(v) {
    var n = typeof v === "number" ? v : parseFloat(v);
    if (isNaN(n)) return null;
    for (var i = 0; i < BUOY_OPTIONS.length; i++) {
      if (BUOY_OPTIONS[i] === n) return n;
    }
    if (n > 0 && n <= 6) return n;
    return null;
  }

  function newSetId() {
    return "set-" + Date.now() + "-" + Math.floor(Math.random() * 1e6);
  }

  function normalizeSets(src) {
    var out = [];
    if (!Array.isArray(src)) return out;
    for (var i = 0; i < src.length; i++) {
      var row = src[i];
      if (!row || typeof row !== "object") continue;
      var buoys = parseBuoys(row.buoys);
      if (buoys == null) continue;
      var pass = normalizePass(row.off, row.mph);
      out.push({
        id: typeof row.id === "string" && row.id ? row.id : newSetId(),
        date: typeof row.date === "string" && row.date ? row.date : todayISO(),
        off: pass.off,
        mph: pass.mph,
        buoys: buoys
      });
    }
    return out;
  }

  function migratePasses(src) {
    var out = [];
    var k;
    for (k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      if (!/^\d+-\d+$/.test(k)) continue;
      var n = parseFloat(src[k]);
      if (!(n > 0)) continue;
      if (n > 6) n = 6;
      var parts = k.split("-");
      var pass = normalizePass(parts[0], parts[1]);
      out.push({
        id: "migrated-" + k,
        date: todayISO(),
        off: pass.off,
        mph: pass.mph,
        buoys: n
      });
    }
    return out;
  }

  function lineLabel(off) {
    if (state.units === "kph") return LINE_METERS[off] || (off + " off");
    return off + " off";
  }

  function speedLabel(mph) {
    if (state.units === "kph") return (MPH_TO_KPH[mph] || mph) + " kph";
    return mph + " mph";
  }

  function setupShort(pass) {
    return lineLabel(pass.off) + " · " + speedLabel(pass.mph);
  }

  function formatBuoys(n) {
    return String(n);
  }

  /* more buoys, then shorter line / higher off, then faster mph */
  function compareSetsDesc(a, b) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    if (a.buoys !== b.buoys) return b.buoys - a.buoys;
    if (a.off !== b.off) return b.off - a.off;
    if (a.mph !== b.mph) return b.mph - a.mph;
    return 0;
  }

  function pickBestSet(sets) {
    if (!sets || !sets.length) return null;
    var best = sets[0];
    var i;
    for (i = 1; i < sets.length; i++) {
      if (compareSetsDesc(sets[i], best) < 0) best = sets[i];
    }
    return best;
  }

  function bestSet(person) {
    var p = person || currentPerson();
    if (!p) return null;
    return pickBestSet(p.slalomSets || []);
  }

  function bestSetOnDate(person, date) {
    if (!person || !date) return null;
    var daySets = (person.slalomSets || []).filter(function (s) {
      return s.date === date;
    });
    return pickBestSet(daySets);
  }

  function allSets() {
    var out = [];
    var people = state.people || [];
    var i, j;
    for (i = 0; i < people.length; i++) {
      var p = people[i];
      var sets = p.slalomSets || [];
      for (j = 0; j < sets.length; j++) {
        var s = sets[j];
        out.push({
          id: s.id,
          date: s.date,
          off: s.off,
          mph: s.mph,
          buoys: s.buoys,
          personId: p.id,
          personName: p.name
        });
      }
    }
    return out;
  }

  function latestSessionDate() {
    var max = "";
    var people = state.people || [];
    var i, j;
    for (i = 0; i < people.length; i++) {
      var sets = people[i].slalomSets || [];
      for (j = 0; j < sets.length; j++) {
        var d = sets[j].date;
        if (d && d > max) max = d;
      }
    }
    return max || null;
  }

  function computeSlalomScore() {
    var best = bestSet();
    return best ? best.buoys : 0;
  }

  function computeScore() {
    var score = 0;
    var items = itemsFor("kneeboard");
    for (var i = 0; i < items.length; i++) {
      var id = items[i].id;
      var entry = getEntry("kneeboard", id);
      if (!isLanded(entry)) continue;
      if (modeOf("kneeboard", id) === "hard") {
        var n = landCount(entry);
        if (n < 1) n = 1;
        score += 5 + Math.max(0, n - 1) * 2;
      } else {
        score += 1;
      }
    }
    return score;
  }

  function personTrophies() {
    var p = currentPerson();
    if (!Array.isArray(p.trophies)) p.trophies = [];
    return p.trophies;
  }

  function hasTrophy(id) {
    var trophies = personTrophies();
    for (var i = 0; i < trophies.length; i++) {
      if (trophies[i].id === id) return true;
    }
    return false;
  }

  function trophyTitle(id) {
    for (var i = 0; i < TROPHY_DEFS.length; i++) {
      if (TROPHY_DEFS[i].id === id) return TROPHY_DEFS[i].title;
    }
    return id;
  }

  function awardTrophy(id, earned) {
    if (hasTrophy(id)) return null;
    var row = {
      id: id,
      title: trophyTitle(id),
      earned: earned || todayISO()
    };
    personTrophies().push(row);
    return row;
  }

  function scanLogbook() {
    var out = {
      anyLand: false,
      earliest: null,
      earliestHard: null,
      heliDate: null,
      fiveDate: null
    };
    var items = itemsFor("kneeboard");
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var entry = getEntry("kneeboard", item.id);
      if (!isLanded(entry)) continue;
      out.anyLand = true;
      out.earliest = minISO(out.earliest, entry.firstDate);
      if (item.id === "kb-heli") out.heliDate = entry.firstDate || todayISO();
      if (modeOf("kneeboard", item.id) === "hard") {
        out.earliestHard = minISO(out.earliestHard, entry.firstDate);
        var n = landCount(entry);
        if (n >= 5) {
          var fifth = (entry.dates && entry.dates[4]) ? entry.dates[4] : entry.firstDate;
          out.fiveDate = minISO(out.fiveDate, fifth);
        }
      }
    }
    return out;
  }

  function collectAwards(opts) {
    opts = opts || {};
    var p = currentPerson();
    if (opts.hasMedia) p.hasMedia = true;
    var scan = scanLogbook();
    var newly = [];
    var row;
    if (scan.anyLand) {
      row = awardTrophy("first-trick", scan.earliest);
      if (row) newly.push(row);
      row = awardTrophy("lake-opener", scan.earliest);
      if (row) newly.push(row);
    }
    if (scan.earliestHard) {
      row = awardTrophy("first-hard", scan.earliestHard);
      if (row) newly.push(row);
    }
    if (scan.heliDate) {
      row = awardTrophy("first-heli", scan.heliDate);
      if (row) newly.push(row);
    }
    if (scan.fiveDate) {
      row = awardTrophy("five-hard", scan.fiveDate);
      if (row) newly.push(row);
    }
    if (p.hasMedia) {
      row = awardTrophy("first-media", todayISO());
      if (row) newly.push(row);
    }
    return newly;
  }

  function paintUnits() {
    var mph = document.getElementById("units-mph");
    var kph = document.getElementById("units-kph");
    var isKph = state.units === "kph";
    if (mph) {
      mph.classList.toggle("is-on", !isKph);
      mph.setAttribute("aria-pressed", isKph ? "false" : "true");
    }
    if (kph) {
      kph.classList.toggle("is-on", isKph);
      kph.setAttribute("aria-pressed", isKph ? "true" : "false");
    }
  }

  function paintScore() {
    var p = currentPerson();
    var el = document.getElementById("person-score");
    if (el) {
      var main = el.querySelector(".stat-main") || el;
      main.textContent = "Score · " + ((p && p.score) || 0);
    }
    var best = bestSet(p);
    var slMain = document.getElementById("slalom-score-main");
    var slSub = document.getElementById("slalom-score-sub");
    if (slMain) {
      if (!best) slMain.textContent = "Slalom · —";
      else slMain.textContent = "Slalom · " + formatBuoys(best.buoys);
    }
    if (slSub) {
      if (!best) {
        slSub.textContent = "";
        slSub.hidden = true;
      } else {
        slSub.textContent = setupShort(best);
        slSub.hidden = false;
      }
    }
    paintSlalomBest();
  }

  function paintSlalomBest() {
    var num = document.getElementById("slalom-best-number");
    var setup = document.getElementById("slalom-best-setup");
    var best = bestSet();
    if (num) num.textContent = best ? formatBuoys(best.buoys) : "—";
    if (setup) setup.textContent = best ? setupShort(best) : "";
  }

  function medalSvg() {
    return '<svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">' +
      '<circle cx="14" cy="16" r="8" fill="#E7C56A" stroke="#8a6a12" stroke-width="1.4"/>' +
      '<circle cx="14" cy="16" r="4.2" fill="#FBFDFF"/>' +
      '<path d="M9 4 L14 10 L19 4 L16.5 4 L14 8 L11.5 4 Z" fill="#FC5200"/>' +
      "</svg>";
  }

  function paintShelf() {
    var list = document.getElementById("trophy-shelf");
    var empty = document.getElementById("trophy-empty");
    if (!list) return;
    var trophies = personTrophies();
    if (!trophies.length) {
      list.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    var html = "";
    for (var i = 0; i < trophies.length; i++) {
      var t = trophies[i];
      html += '<li class="trophy" data-id="' + escapeHtml(t.id) + '">';
      html += '<span class="trophy-medal">' + medalSvg() + "</span>";
      html += '<span class="trophy-title">' + escapeHtml(t.title) + "</span>";
      html += '<time class="trophy-when" datetime="' + escapeHtml(t.earned || "") + '">' +
        escapeHtml(prettyDate(t.earned)) + "</time>";
      html += "</li>";
    }
    list.innerHTML = html;
  }

  var toastTimer = null;

  function showToast(kind, text) {
    var el = document.getElementById("app-toast");
    if (!el || !text) return;
    if (kind === "trophy") {
      el.innerHTML = "<strong>Trophy</strong>" + escapeHtml(text);
    } else {
      el.innerHTML = escapeHtml(text);
    }
    el.classList.add("is-on");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("is-on");
    }, 2800);
  }

  function afterProgress(opts) {
    var newly = collectAwards(opts);
    save(state);
    paintScore();
    paintShelf();
    if (newly.length) {
      showToast("trophy", newly.map(function (t) { return t.title; }).join(" · "));
    }
  }

  function paintNameField() {
    var field = document.getElementById("person-name");
    var p = currentPerson();
    if (field) field.value = (p && p.name) || "";
  }

  function focusNameField() {
    var field = document.getElementById("person-name");
    if (!field) return;
    field.focus();
    if (typeof field.select === "function") field.select();
  }

  function switchPerson(id) {
    if (!id) return;
    var people = state.people || [];
    var found = false;
    var i;
    for (i = 0; i < people.length; i++) {
      if (people[i].id === id) {
        found = true;
        break;
      }
    }
    if (!found) return;
    state.currentPersonId = id;
    save(state);
    paintNameField();
    paintUnits();
    paintScore();
    paintShelf();
    renderAll();
  }

  var state = load();
  (function prefillFromEmail() {
    var email = window.LAKE_USER_EMAIL;
    if (!email || typeof email !== "string") return;
    var person = currentPerson();
    if (!person) return;
    if (String(person.name || "").trim()) return;
    var local = (email.split("@")[0] || "").trim();
    if (!local) return;
    person.name = local;
    save(state);
  })();
  ensureSeedSkiers();

  /* ---- IndexedDB media (file:// safe: no modules, no server fetch) ---- */

  var idb = null;
  var idbReady = false;
  var memoryMedia = {};
  var objectUrls = {};

  function mediaKey(sport, id) {
    var p = currentPerson();
    var pid = p && p.id ? p.id : "p1";
    return pid + "::" + sport + "::" + id;
  }

  function legacyMediaKey(sport, id) {
    return sport + "::" + id;
  }

  function keyBelongsToCurrent(key) {
    var p = currentPerson();
    var pid = p && p.id ? p.id : "p1";
    key = String(key || "");
    if (key.indexOf(pid + "::") === 0) return true;
    if (pid === "p1" && (key.indexOf("kneeboard::") === 0 || key.indexOf("slalom::") === 0)) return true;
    return false;
  }

  function urlFor(key, blob) {
    if (objectUrls[key]) {
      try { URL.revokeObjectURL(objectUrls[key]); } catch (e) {}
    }
    objectUrls[key] = URL.createObjectURL(blob);
    return objectUrls[key];
  }

  function openMediaDb(done) {
    if (!window.indexedDB) {
      idbReady = true;
      done();
      return;
    }
    try {
      var req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
      req.onsuccess = function (e) {
        idb = e.target.result;
        idbReady = true;
        done();
      };
      req.onerror = function () {
        idb = null;
        idbReady = true;
        done();
      };
    } catch (err) {
      idb = null;
      idbReady = true;
      done();
    }
  }

  function putMedia(key, record, cb) {
    memoryMedia[key] = record;
    if (!idb) { cb(null); return; }
    try {
      var tx = idb.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(record, key);
      tx.oncomplete = function () { cb(null); };
      tx.onerror = function () { cb(tx.error || new Error("save failed")); };
    } catch (err) {
      cb(err);
    }
  }

  function getMedia(key, cb) {
    if (memoryMedia[key]) { cb(null, memoryMedia[key]); return; }
    if (!idb) { cb(null, null); return; }
    try {
      var tx = idb.transaction(IDB_STORE, "readonly");
      var req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = function () {
        var rec = req.result || null;
        if (rec) memoryMedia[key] = rec;
        cb(null, rec);
      };
      req.onerror = function () { cb(req.error, null); };
    } catch (err) {
      cb(err, null);
    }
  }

  function deleteMedia(key, cb) {
    delete memoryMedia[key];
    if (objectUrls[key]) {
      try { URL.revokeObjectURL(objectUrls[key]); } catch (e) {}
      delete objectUrls[key];
    }
    if (!idb) { if (cb) cb(null); return; }
    try {
      var tx = idb.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = function () { if (cb) cb(null); };
      tx.onerror = function () { if (cb) cb(tx.error); };
    } catch (err) {
      if (cb) cb(err);
    }
  }

  function scanAnyMedia(cb) {
    var p = currentPerson();
    if (p && p.hasMedia) { cb(true); return; }
    var k;
    for (k in memoryMedia) {
      if (keyBelongsToCurrent(k) && memoryMedia[k] && memoryMedia[k].blob) { cb(true); return; }
    }
    if (!idb) { cb(false); return; }
    try {
      var tx = idb.transaction(IDB_STORE, "readonly");
      var req = tx.objectStore(IDB_STORE).openCursor();
      var answered = false;
      req.onsuccess = function (e) {
        if (answered) return;
        var cursor = e.target.result;
        if (!cursor) {
          answered = true;
          cb(false);
          return;
        }
        if (keyBelongsToCurrent(cursor.key)) {
          answered = true;
          cb(true);
          return;
        }
        cursor.continue();
      };
      req.onerror = function () {
        if (!answered) { answered = true; cb(false); }
      };
    } catch (err) {
      cb(false);
    }
  }

  function kindOf(record) {
    var t = (record && record.type) || "";
    if (t.indexOf("video") === 0) return "video";
    return "image";
  }

  function paintMedia(slot, record, errMsg) {
    var preview = slot.querySelector(".media-preview");
    var add = slot.querySelector(".media-add");
    var remove = slot.querySelector(".media-remove");
    var note = slot.querySelector(".media-note");
    var error = slot.querySelector(".media-error");
    if (error) error.textContent = errMsg || "";
    if (!record || !record.blob) {
      preview.hidden = true;
      preview.innerHTML = "";
      add.hidden = false;
      remove.hidden = true;
      if (note) note.hidden = false;
      return;
    }
    var key = mediaKey(slot.getAttribute("data-sport"), slot.getAttribute("data-id"));
    var url = urlFor(key, record.blob);
    var kind = kindOf(record);
    if (kind === "video") {
      preview.innerHTML = '<video src="' + url + '" controls playsinline preload="metadata"></video>';
    } else {
      preview.innerHTML = '<img src="' + url + '" alt="Trick photo">';
    }
    preview.hidden = false;
    add.querySelector("span").textContent = "Replace photo or video";
    add.hidden = false;
    remove.hidden = false;
    if (note) note.hidden = false;
  }

  function fillMedia(sport) {
    var slots = document.querySelectorAll("#list-" + sport + " .media-slot");
    for (var i = 0; i < slots.length; i++) {
      (function (slot) {
        var sportId = slot.getAttribute("data-sport");
        var trickId = slot.getAttribute("data-id");
        var key = mediaKey(sportId, trickId);
        getMedia(key, function (err, rec) {
          if (rec) {
            paintMedia(slot, rec, err ? "Couldn’t read saved media." : "");
            return;
          }
          var p = currentPerson();
          if (p && p.id === "p1") {
            getMedia(legacyMediaKey(sportId, trickId), function (err2, rec2) {
              paintMedia(slot, rec2, err2 ? "Couldn’t read saved media." : "");
            });
          } else {
            paintMedia(slot, null, err ? "Couldn’t read saved media." : "");
          }
        });
      })(slots[i]);
    }
  }

  function fillAllMedia() {
    fillMedia("kneeboard");
  }

  /* ---- render ---- */

  function renderSport(sport) {
    if (sport !== "kneeboard") return;
    var list = document.getElementById("list-" + sport);
    var items = itemsFor(sport);
    var ordered = [];
    var i;
    for (i = 0; i < items.length; i++) {
      if (modeOf(sport, items[i].id) !== "hard") ordered.push(items[i]);
    }
    for (i = 0; i < items.length; i++) {
      if (modeOf(sport, items[i].id) === "hard") ordered.push(items[i]);
    }
    items = ordered;
    var html = "";
    var lastGroup = "";
    for (i = 0; i < items.length; i++) {
      var item = items[i];
      var entry = getEntry(sport, item.id);
      var mode = modeOf(sport, item.id);
      if (mode !== lastGroup) {
        lastGroup = mode;
        html += '<li class="trick-group">' + (mode === "hard" ? "Hard" : "Easy") + "</li>";
      }
      var landed = isLanded(entry);
      var custom = !!item.custom;
      var classes = "trick-item" +
        (landed ? " is-done" : "") +
        (custom ? " is-custom" : "") +
        (mode === "hard" ? " is-hard" : " is-easy");
      html += '<li class="' + classes + '" data-sport="' + sport + '" data-id="' + escapeHtml(item.id) + '">';
      html += '<div class="trick-main">';
      html += '<label class="trick-label">';
      html += '<input type="checkbox" data-act="land" data-sport="' + sport + '" data-id="' + escapeHtml(item.id) + '"' + (landed ? " checked" : "") + ">";
      html += '<span class="name">' + escapeHtml(item.name);
      if (custom) html += '<span class="write-in">Write-in</span>';
      html += "</span></label>";

      if (landed) {
        html += '<div class="first-date"><label>First landed';
        html += '<input type="date" class="first-date-input" data-act="first-date" data-sport="' + sport + '" data-id="' + escapeHtml(item.id) + '" value="' + escapeHtml(entry.firstDate) + '">';
        html += "</label></div>";

        if (mode === "hard") {
          var n = entry.dates.length;
          html += '<div class="logbook">';
          html += '<p class="log-count">Logged ' + n + (n === 1 ? " time" : " times") + "</p>";
          if (n > 1) {
            html += '<ul class="date-list">';
            for (var d = 1; d < n; d++) {
              html += "<li>";
              html += '<input type="date" class="log-date" data-act="log-date" data-sport="' + sport + '" data-id="' + escapeHtml(item.id) + '" data-index="' + d + '" value="' + escapeHtml(entry.dates[d]) + '">';
              html += '<button type="button" class="drop-date" data-act="drop-date" data-sport="' + sport + '" data-id="' + escapeHtml(item.id) + '" data-index="' + d + '">Remove</button>';
              html += "</li>";
            }
            html += "</ul>";
          }
          html += '<button type="button" class="log-again" data-act="log-again" data-sport="' + sport + '" data-id="' + escapeHtml(item.id) + '">Log today</button>';
          html += "</div>";
        }

        html += '<div class="media-slot" data-sport="' + sport + '" data-id="' + escapeHtml(item.id) + '">';
        html += '<div class="media-preview" hidden></div>';
        html += '<label class="media-add"><span>Photo or short video</span>';
        html += '<input type="file" class="media-file" accept="image/*,video/*" data-act="media-file" data-sport="' + sport + '" data-id="' + escapeHtml(item.id) + '">';
        html += "</label>";
        html += '<button type="button" class="media-remove" hidden data-act="media-remove" data-sport="' + sport + '" data-id="' + escapeHtml(item.id) + '">Remove media</button>';
        html += '<p class="media-note">Stays in this browser only.</p>';
        html += '<p class="media-error"></p>';
        html += "</div>";
      }

      html += "</div>";
      html += '<div class="trick-side">';
      html += '<button type="button" class="mode-toggle is-' + mode + '" data-act="mode" data-sport="' + sport + '" data-id="' + escapeHtml(item.id) + '" aria-label="Mode: ' + (mode === "hard" ? "hard logbook" : "easy unlock") + '. Click to switch.">';
      html += mode === "hard" ? "Hard" : "Easy";
      html += "</button>";
      if (custom) {
        html += '<button type="button" class="remove" data-act="remove" data-sport="' + sport + '" data-id="' + escapeHtml(item.id) + '">Remove</button>';
      }
      html += "</div></li>";
    }
    list.innerHTML = html;
    updateProgress(sport);
    if (idbReady) fillMedia(sport);
  }

  function updateProgress(sport) {
    if (sport !== "kneeboard") return;
    var items = itemsFor(sport);
    var done = 0;
    for (var i = 0; i < items.length; i++) {
      if (isLanded(getEntry(sport, items[i].id))) done++;
    }
    var total = items.length;
    var pct = total ? Math.round((done / total) * 100) : 0;
    var card = document.querySelector('[data-progress="' + sport + '"]');
    card.querySelector(".progress-counts").textContent = done + " / " + total + " · " + pct + "%";
    card.querySelector(".lake-fill").style.width = pct + "%";
  }

  function setSelectedPass(off, mph) {
    var p = currentPerson();
    p.selectedPass = normalizePass(off, mph);
    save(state);
    renderSlalom();
  }

  function logSet(buoys) {
    var p = currentPerson();
    if (!personNameOf(p)) {
      showToast("log", "Add a name to hit the board");
      focusNameField();
      return;
    }
    var n = parseBuoys(buoys);
    if (n == null) return;
    var pass = normalizePass(p.selectedPass.off, p.selectedPass.mph);
    p.selectedPass = pass;
    var row = {
      id: newSetId(),
      date: todayISO(),
      off: pass.off,
      mph: pass.mph,
      buoys: n
    };
    p.slalomSets.unshift(row);
    save(state);
    paintScore();
    renderHistory();
    renderBoards();
    showToast("log", "Logged " + formatBuoys(n) + " · " + setupShort(pass));
  }

  function deleteSet(id) {
    var p = currentPerson();
    p.slalomSets = (p.slalomSets || []).filter(function (s) {
      return s.id !== id;
    });
    save(state);
    paintScore();
    renderHistory();
    renderBoards();
  }

  function renderRoster() {
    var row = document.getElementById("skier-chips");
    if (!row) return;
    var people = state.people || [];
    var curId = currentPerson().id;
    var html = "";
    var i;
    for (i = 0; i < people.length; i++) {
      var p = people[i];
      var on = p.id === curId;
      html += '<button type="button" class="chip is-skier' + (on ? " is-on" : "") +
        '" data-act="select-skier" data-id="' + escapeHtml(p.id) +
        '" aria-pressed="' + (on ? "true" : "false") + '">' +
        escapeHtml(displayName(p)) + "</button>";
    }
    row.innerHTML = html;
  }

  function renderSession() {
    var list = document.getElementById("session-list");
    var empty = document.getElementById("session-empty");
    var head = document.getElementById("session-head");
    var heading = document.getElementById("latest-session-heading");
    if (!list) return;
    var date = latestSessionDate();
    if (heading) {
      heading.textContent = date ? ("Latest session · " + prettyDateShort(date)) : "Latest session";
    }
    if (!date) {
      list.innerHTML = "";
      if (empty) empty.hidden = false;
      if (head) head.hidden = true;
      return;
    }
    var people = state.people || [];
    var rows = [];
    var i;
    for (i = 0; i < people.length; i++) {
      var best = bestSetOnDate(people[i], date);
      if (!best) continue;
      rows.push({ person: people[i], set: best });
    }
    rows.sort(function (a, b) {
      return compareSetsDesc(a.set, b.set);
    });
    if (!rows.length) {
      list.innerHTML = "";
      if (empty) empty.hidden = false;
      if (head) head.hidden = true;
      return;
    }
    if (empty) empty.hidden = true;
    if (head) head.hidden = false;
    var curId = currentPerson().id;
    var html = "";
    for (i = 0; i < rows.length; i++) {
      var r = rows[i];
      var you = r.person.id === curId;
      html += '<li class="board-row' + (you ? " is-you" : "") + '">';
      html += '<div class="session-cols">';
      html += '<span class="board-name">' + escapeHtml(displayName(r.person)) + "</span>";
      html += '<span class="board-line">' + escapeHtml(lineLabel(r.set.off)) + "</span>";
      html += '<span class="board-speed">' + escapeHtml(speedLabel(r.set.mph)) + "</span>";
      html += '<span class="board-buoys">' + escapeHtml(formatBuoys(r.set.buoys)) + "</span>";
      html += "</div></li>";
    }
    list.innerHTML = html;
  }

  function renderClubBoard() {
    var list = document.getElementById("club-list");
    var empty = document.getElementById("club-empty");
    var head = document.getElementById("club-head");
    if (!list) return;
    var people = state.people || [];
    var rows = [];
    var i;
    for (i = 0; i < people.length; i++) {
      var best = bestSet(people[i]);
      if (!best) continue;
      rows.push({ person: people[i], set: best });
    }
    rows.sort(function (a, b) {
      return compareSetsDesc(a.set, b.set);
    });
    if (!rows.length) {
      list.innerHTML = "";
      if (empty) empty.hidden = false;
      if (head) head.hidden = true;
      return;
    }
    if (empty) empty.hidden = true;
    if (head) head.hidden = false;
    var curId = currentPerson().id;
    var html = "";
    for (i = 0; i < rows.length; i++) {
      var r = rows[i];
      var you = r.person.id === curId;
      var first = i === 0;
      html += '<li class="board-row' + (you ? " is-you" : "") + (first ? " is-first" : "") + '">';
      html += '<div class="club-cols">';
      html += '<span class="board-rank">' + (i + 1) + "</span>";
      html += '<span class="board-name">' + escapeHtml(displayName(r.person)) + "</span>";
      html += '<span class="board-date">' + escapeHtml(prettyDateShort(r.set.date)) + "</span>";
      html += '<span class="board-line">' + escapeHtml(lineLabel(r.set.off)) + "</span>";
      html += '<span class="board-speed">' + escapeHtml(speedLabel(r.set.mph)) + "</span>";
      html += '<span class="board-buoys">' + escapeHtml(formatBuoys(r.set.buoys)) + "</span>";
      html += "</div></li>";
    }
    list.innerHTML = html;
  }

  function renderBest10() {
    var list = document.getElementById("best-list");
    var empty = document.getElementById("best-empty");
    var head = document.getElementById("best-head");
    if (!list) return;
    var rows = allSets();
    rows.sort(compareSetsDesc);
    if (rows.length > 10) rows = rows.slice(0, 10);
    if (!rows.length) {
      list.innerHTML = "";
      if (empty) empty.hidden = false;
      if (head) head.hidden = true;
      return;
    }
    if (empty) empty.hidden = true;
    if (head) head.hidden = false;
    var curId = currentPerson().id;
    var html = "";
    var i;
    for (i = 0; i < rows.length; i++) {
      var r = rows[i];
      var you = r.personId === curId;
      var first = i === 0;
      html += '<li class="board-row' + (you ? " is-you" : "") + (first ? " is-first" : "") + '">';
      html += '<div class="club-cols">';
      html += '<span class="board-rank">' + (i + 1) + "</span>";
      html += '<span class="board-name">' + escapeHtml(displayName({ name: r.personName })) + "</span>";
      html += '<span class="board-date">' + escapeHtml(prettyDateShort(r.date)) + "</span>";
      html += '<span class="board-line">' + escapeHtml(lineLabel(r.off)) + "</span>";
      html += '<span class="board-speed">' + escapeHtml(speedLabel(r.mph)) + "</span>";
      html += '<span class="board-buoys">' + escapeHtml(formatBuoys(r.buoys)) + "</span>";
      html += "</div></li>";
    }
    list.innerHTML = html;
  }

  function renderBoards() {
    renderSession();
    renderClubBoard();
    renderBest10();
  }

  function renderSlalom() {
    var p = currentPerson();
    p.selectedPass = normalizePass(p.selectedPass.off, p.selectedPass.mph);
    var pass = p.selectedPass;
    var i;
    var html = "";
    for (i = 0; i < SLALOM_OFFS.length; i++) {
      var off = SLALOM_OFFS[i];
      var on = off === pass.off;
      html += '<button type="button" class="chip' + (on ? " is-on" : "") +
        '" data-act="select-off" data-off="' + off + '" aria-pressed="' + (on ? "true" : "false") + '">' +
        escapeHtml(lineLabel(off)) + "</button>";
    }
    document.getElementById("line-chips").innerHTML = html;

    html = "";
    for (i = 0; i < SLALOM_MPHS.length; i++) {
      var mph = SLALOM_MPHS[i];
      var onM = mph === pass.mph;
      html += '<button type="button" class="chip' + (onM ? " is-on" : "") +
        '" data-act="select-mph" data-mph="' + mph + '" aria-pressed="' + (onM ? "true" : "false") + '">' +
        escapeHtml(speedLabel(mph)) + "</button>";
    }
    document.getElementById("speed-chips").innerHTML = html;

    html = "";
    for (i = 0; i < BUOY_OPTIONS.length; i++) {
      var b = BUOY_OPTIONS[i];
      html += '<button type="button" class="buoy-btn" data-act="log-buoys" data-n="' + b + '">' +
        formatBuoys(b) + "</button>";
    }
    document.getElementById("buoy-chips").innerHTML = html;

    renderRoster();
    renderHistory();
    renderBoards();
  }

  function renderHistory() {
    var list = document.getElementById("set-history");
    var empty = document.getElementById("history-empty");
    var head = document.getElementById("sets-head");
    var p = currentPerson();
    var sets = p.slalomSets || [];
    var best = bestSet(p);
    var bestId = best ? best.id : "";
    if (!list) return;
    if (!sets.length) {
      list.innerHTML = "";
      if (empty) empty.hidden = false;
      if (head) head.hidden = true;
      return;
    }
    if (empty) empty.hidden = true;
    if (head) head.hidden = false;
    var html = "";
    for (var i = 0; i < sets.length; i++) {
      var s = sets[i];
      html += '<li class="set-row' + (s.id === bestId ? " is-best" : "") + '" data-id="' + escapeHtml(s.id) + '">';
      html += '<div class="set-cols">';
      html += '<span class="set-date">' + escapeHtml(prettyDate(s.date)) + "</span>";
      html += '<span class="set-line">' + escapeHtml(lineLabel(s.off)) + "</span>";
      html += '<span class="set-speed">' + escapeHtml(speedLabel(s.mph)) + "</span>";
      html += '<span class="set-buoys">' + escapeHtml(formatBuoys(s.buoys)) + "</span>";
      html += "</div>";
      html += '<button type="button" class="set-delete" data-act="delete-set" data-id="' +
        escapeHtml(s.id) + '">Delete set</button>';
      html += "</li>";
    }
    list.innerHTML = html;
  }

  function renderAll() {
    renderSport("kneeboard");
    renderSlalom();
  }

  function switchSport(sport) {
    var tabs = document.querySelectorAll(".tab");
    for (var i = 0; i < tabs.length; i++) {
      var on = tabs[i].getAttribute("data-sport") === sport;
      tabs[i].classList.toggle("is-active", on);
      tabs[i].setAttribute("aria-selected", on ? "true" : "false");
    }
    var panels = document.querySelectorAll(".panel");
    for (var j = 0; j < panels.length; j++) {
      var show = panels[j].getAttribute("data-sport") === sport;
      panels[j].classList.toggle("is-active", show);
      if (show) panels[j].removeAttribute("hidden");
      else panels[j].setAttribute("hidden", "");
    }
  }

  function addSkier(raw) {
    var name = String(raw || "").replace(/\s+/g, " ").trim();
    if (!name) return false;
    if (nameTaken(name)) {
      showToast("log", "That skier is already on the roster");
      return false;
    }
    var p = emptyPerson(newPersonId(), name);
    state.people.push(p);
    state.currentPersonId = p.id;
    save(state);
    paintNameField();
    paintUnits();
    paintScore();
    paintShelf();
    renderAll();
    return true;
  }

  /* ---- events ---- */

  document.querySelector(".sport-tabs").addEventListener("click", function (e) {
    var tab = e.target.closest(".tab");
    if (!tab) return;
    switchSport(tab.getAttribute("data-sport"));
  });

  document.getElementById("person-name").addEventListener("input", function (e) {
    var p = currentPerson();
    var val = e.target.value;
    var trimmed = String(val || "").replace(/\s+/g, " ").trim();
    if (trimmed && nameTaken(trimmed, p.id)) return;
    p.name = val;
    save(state);
    renderRoster();
    renderBoards();
  });

  document.getElementById("person-name").addEventListener("blur", function (e) {
    var p = currentPerson();
    var trimmed = String(e.target.value || "").replace(/\s+/g, " ").trim();
    if (trimmed && nameTaken(trimmed, p.id)) {
      e.target.value = p.name || "";
      showToast("log", "That skier is already on the roster");
      return;
    }
    p.name = trimmed;
    save(state);
    e.target.value = p.name;
    renderRoster();
    renderBoards();
  });

  document.getElementById("add-skier-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var field = document.getElementById("add-skier-name");
    var name = field ? field.value : "";
    if (addSkier(name) && field) field.value = "";
    if (field) field.focus();
  });

  document.querySelector(".masthead").addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;
    if (btn.getAttribute("data-act") === "units") {
      var u = btn.getAttribute("data-units");
      if (u !== "mph" && u !== "kph") return;
      state.units = u;
      save(state);
      paintUnits();
      paintScore();
      renderSlalom();
    }
  });

  document.querySelector("main").addEventListener("change", function (e) {
    var el = e.target;
    var sport = el.getAttribute("data-sport");
    var id = el.getAttribute("data-id");
    if (!sport || !id) return;
    var act = el.getAttribute("data-act");

    if (act === "land" && el.type === "checkbox") {
      var entry = ensureEntry(sport, id);
      if (el.checked) {
        if (!isLanded(entry)) landNow(entry);
      } else {
        clearLand(entry);
      }
      afterProgress();
      renderSport(sport);
      return;
    }

    if (act === "first-date") {
      var entryF = ensureEntry(sport, id);
      if (!el.value) return;
      entryF.firstDate = el.value;
      if (!entryF.dates.length) entryF.dates = [el.value];
      else entryF.dates[0] = el.value;
      syncCount(entryF);
      afterProgress();
      return;
    }

    if (act === "log-date") {
      var entryL = ensureEntry(sport, id);
      var idx = parseInt(el.getAttribute("data-index"), 10);
      if (!el.value || isNaN(idx) || !entryL.dates[idx]) return;
      entryL.dates[idx] = el.value;
      afterProgress();
      return;
    }

    if (act === "media-file" && el.files && el.files[0]) {
      var file = el.files[0];
      var rec = {
        type: file.type || (file.name && /\.(mp4|mov|webm|m4v)$/i.test(file.name) ? "video/mp4" : "image/jpeg"),
        name: file.name || "media",
        blob: file
      };
      var key = mediaKey(sport, id);
      var slot = el.closest(".media-slot");
      putMedia(key, rec, function (err) {
        paintMedia(slot, rec, err ? "Saved a preview, but this browser couldn’t keep the file (too large or storage full). Try a smaller clip." : "");
        afterProgress({ hasMedia: true });
      });
    }
  });

  document.querySelector("main").addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;
    var act = btn.getAttribute("data-act");
    if (!act) return;

    if (act === "select-skier") {
      switchPerson(btn.getAttribute("data-id"));
      return;
    }
    if (act === "select-off") {
      setSelectedPass(btn.getAttribute("data-off"), currentPerson().selectedPass.mph);
      return;
    }
    if (act === "select-mph") {
      setSelectedPass(currentPerson().selectedPass.off, btn.getAttribute("data-mph"));
      return;
    }
    if (act === "log-buoys") {
      logSet(btn.getAttribute("data-n"));
      return;
    }
    if (act === "delete-set") {
      deleteSet(btn.getAttribute("data-id"));
      return;
    }

    var sport = btn.getAttribute("data-sport");
    var id = btn.getAttribute("data-id");
    if (!sport || !id) return;

    if (act === "mode") {
      var entry = ensureEntry(sport, id);
      if (entry.mode === "hard") {
        entry.mode = "easy";
      } else {
        entry.mode = "hard";
        if (entry.firstDate && !entry.dates.length) {
          entry.dates = [entry.firstDate];
        }
        syncCount(entry);
      }
      var item = findItem(sport, id);
      if (item && item.custom) item.mode = entry.mode;
      afterProgress();
      renderSport(sport);
      return;
    }

    if (act === "log-again") {
      var entryA = ensureEntry(sport, id);
      if (!isLanded(entryA)) landNow(entryA);
      else {
        entryA.dates.push(todayISO());
        syncCount(entryA);
      }
      afterProgress();
      renderSport(sport);
      return;
    }

    if (act === "drop-date") {
      var entryD = ensureEntry(sport, id);
      var dropIdx = parseInt(btn.getAttribute("data-index"), 10);
      if (isNaN(dropIdx) || dropIdx <= 0) return;
      entryD.dates.splice(dropIdx, 1);
      syncCount(entryD);
      afterProgress();
      renderSport(sport);
      return;
    }

    if (act === "remove") {
      var p = currentPerson();
      p.sports[sport].customs = p.sports[sport].customs.filter(function (c) {
        return c.id !== id;
      });
      delete p.sports[sport].tricks[id];
      afterProgress();
      deleteMedia(mediaKey(sport, id));
      renderSport(sport);
      return;
    }

    if (act === "media-remove") {
      var slot = btn.closest(".media-slot");
      deleteMedia(mediaKey(sport, id), function () {
        paintMedia(slot, null);
        var span = slot.querySelector(".media-add span");
        if (span) span.textContent = "Photo or short video";
      });
    }
  });

  var forms = document.querySelectorAll(".add-form");
  for (var f = 0; f < forms.length; f++) {
    forms[f].addEventListener("submit", function (e) {
      e.preventDefault();
      var form = e.currentTarget;
      var sport = form.getAttribute("data-sport");
      var field = form.querySelector('input[name="name"]');
      var hardBox = form.querySelector('input[name="hard"]');
      var name = (field.value || "").replace(/\s+/g, " ").trim();
      if (!name) return;
      var mode = hardBox && hardBox.checked ? "hard" : "easy";
      var custom = {
        id: "custom-" + sport + "-" + Date.now(),
        name: name,
        custom: true,
        mode: mode
      };
      currentPerson().sports[sport].customs.push(custom);
      var entry = ensureEntry(sport, custom.id);
      entry.mode = mode;
      landNow(entry);
      afterProgress();
      field.value = "";
      if (hardBox) hardBox.checked = false;
      renderSport(sport);
      field.focus();
    });
  }

  paintNameField();
  switchSport("slalom");
  renderAll();
  currentPerson().score = computeScore();
  paintUnits();
  paintScore();
  paintShelf();
  openMediaDb(function () {
    fillAllMedia();
    scanAnyMedia(function (found) {
      afterProgress(found ? { hasMedia: true } : {});
    });
  });
})();
