(function () {
  "use strict";

  var STORAGE_KEY = "nrs-ski-lake-tricks-v2" + (window.LAKE_USER_ID ? "-" + window.LAKE_USER_ID : "");
  var CLUB = "Ski Paradise Cleveland";
  var IDB_NAME = "nrs-ski-lake-tricks-v2";
  var IDB_STORE = "media";

  /* Club-shared Kneeboard trick photos: private Supabase Storage +
     kneeboard_log_photos metadata for the selected club. Never written
     to STORAGE_KEY/localStorage as blobs/base64/blob URLs. */
  var PHOTO_MAX_INPUT_BYTES = 15 * 1024 * 1024;
  var PHOTO_MAX_DIMENSION = 1024;
  var PHOTO_QUALITY = 0.72;
  var PHOTO_BUCKET = "kneeboard-photos";
  var PHOTO_JOIN_TOAST = "Join a club to share photos";

  var KNEEBOARD = [
    { id: "kb-ollie", name: "Ollie", diff: 2, mode: "easy" },
    { id: "kb-s90", name: "Surface 90", diff: 2, mode: "easy" },
    { id: "kb-tumble", name: "Tumble turn", diff: 3, mode: "easy" },
    { id: "kb-s180", name: "Surface 180", diff: 3, mode: "easy" },
    { id: "kb-butter", name: "Butter slide", diff: 3, mode: "easy" },
    { id: "kb-s180-rev", name: "Surface 180 reverse", diff: 4, mode: "easy" },
    { id: "kb-wrap", name: "Surface wrap", diff: 4, mode: "easy" },
    { id: "kb-w180", name: "Wake 180", diff: 4, mode: "easy" },
    { id: "kb-s270", name: "Surface 270", diff: 4, mode: "easy" },
    { id: "kb-w180-rev", name: "Wake 180 reverse", diff: 5, mode: "easy" },
    { id: "kb-roll-l", name: "Basic roll left", diff: 5, mode: "easy" },
    { id: "kb-roll-r", name: "Basic roll right", diff: 5, mode: "easy" },
    { id: "kb-s360-r", name: "Surface 360 right", diff: 5, mode: "easy" },
    { id: "kb-wake-wrap", name: "Wake wrap", diff: 5, mode: "easy" },
    { id: "kb-s360-l", name: "Surface 360 left", diff: 6, mode: "easy" },
    { id: "kb-s360-ftf", name: "Surface 360 front-to-front", diff: 6, mode: "easy" },
    { id: "kb-s360-rev", name: "Surface 360 reverse", diff: 6, mode: "easy" },
    { id: "kb-w360", name: "Wake 360", diff: 7, mode: "hard" },
    { id: "kb-heli", name: "Heli (wake 360, handle pass)", diff: 8, mode: "hard" },
    { id: "kb-backroll", name: "Backroll", diff: 8, mode: "hard" },
    { id: "kb-frontflip", name: "Front flip", diff: 8, mode: "hard" },
    { id: "kb-backflip", name: "Backflip", diff: 8, mode: "hard" },
    { id: "kb-s540", name: "Surface 540", diff: 8, mode: "hard" },
    { id: "kb-tantrum", name: "Tantrum", diff: 8, mode: "hard" },
    { id: "kb-w540", name: "Wake 540", diff: 9, mode: "hard" },
    { id: "kb-s720", name: "Surface 720", diff: 9, mode: "hard" },
    { id: "kb-hflip", name: "Handle flip", diff: 9, mode: "hard" },
    { id: "kb-mobius", name: "Mobius", diff: 9, mode: "hard" },
    { id: "kb-w720", name: "Wake 720", diff: 10, mode: "hard" }
  ];

  var CATALOGS = { kneeboard: KNEEBOARD };

  var SLALOM_OFFS = [15, 22, 28, 32];
  var SLALOM_MPHS = [28, 30, 32, 34, 36];
  var LINE_METERS = { 0: "23 m", 15: "18.25 m", 22: "16 m", 28: "14.25 m", 32: "13 m" };
  var MPH_TO_KPH = { 28: 46, 30: 49, 32: 52, 34: 55, 36: 58 };
  var BUOY_OPTIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];
  var DEFAULT_PASS = { off: 15, mph: 28 };

  var SEED_GEN = "invite-only-1";

  function clubRoster() {
    return [];
  }

  function clubState() {
    return window.LAKE_CLUB || {};
  }

  function liveClubName() {
    return clubState().clubName || CLUB;
  }

  function clubVisible() {
    return clubState().status === "approved";
  }

  function myMember() {
    return clubState().me || null;
  }

  function canLogFor(person) {
    if (!clubVisible()) return true;
    var me = myMember();
    if (!me || !person) return false;
    if (person.memberId && person.memberId === me.id) return true;
    if (person.junior === true && person.parentId === me.id) return true;
    return false;
  }


  var TROPHY_DEFS = [
    { id: "first-trick", title: "First trick", how: "Land any kneeboard trick.", icon: "wake" },
    { id: "lake-opener", title: "Lake opener", how: "Open your season — first land of the year.", icon: "sunrise" },
    { id: "first-hard", title: "First hard", how: "Land a hard-band kneeboard trick.", icon: "flame" },
    { id: "first-heli", title: "First heli", how: "Land the Heli (wake 360, handle pass).", icon: "heli" },
    { id: "five-hard", title: "Hard x5", how: "Log the same hard trick five times.", icon: "stack" },
    { id: "first-media", title: "First photo", how: "Share a photo or clip on a landed trick.", icon: "camera" }
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
    if (typeof spec.email === "string" && spec.email) p.email = spec.email;
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
    if (state.seedGen === SEED_GEN && !hasSeedPeople(state.people)) return;
    var kept = [];
    var i;
    for (i = 0; i < state.people.length; i++) {
      if (state.people[i] && state.people[i].seed === true) continue;
      kept.push(state.people[i]);
    }
    if (!kept.length) kept = [emptyPerson("p1", "")];
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
    save(state);
  }

  function findOrMakeSelf(me) {
    var i;
    var p;
    for (i = 0; i < state.people.length; i++) {
      p = state.people[i];
      if (p.memberId === me.id || p.id === me.id) return p;
    }
    var adults = [];
    for (i = 0; i < state.people.length; i++) {
      p = state.people[i];
      if (p && p.junior !== true && !p.memberId && p.seed !== true) adults.push(p);
    }
    if (adults.length === 1) return adults[0];
    p = emptyPerson(me.id, me.display_name);
    state.people.push(p);
    return p;
  }

  function syncClubPeople() {
    if (!clubVisible()) return;
    var me = myMember();
    if (!me || !me.id) return;
    var self = findOrMakeSelf(me);
    self.memberId = me.id;
    self.junior = false;
    if (me.display_name) self.name = me.display_name;
    var juniors = clubState().juniors || [];
    var seen = {};
    var i;
    var j;
    var jp;
    for (i = 0; i < juniors.length; i++) {
      j = juniors[i];
      if (!j || j.status !== "approved") continue;
      seen[j.id] = true;
      jp = null;
      var k;
      for (k = 0; k < state.people.length; k++) {
        if (state.people[k].memberId === j.id || state.people[k].id === j.id) {
          jp = state.people[k];
          break;
        }
      }
      if (!jp) {
        jp = emptyPerson(j.id, j.display_name);
        state.people.push(jp);
      }
      jp.memberId = j.id;
      jp.junior = true;
      jp.parentId = me.id;
      if (j.display_name) jp.name = j.display_name;
    }
    if (!state.currentPersonId) state.currentPersonId = self.id;
    var curOk = false;
    for (i = 0; i < state.people.length; i++) {
      if (state.people[i].id === state.currentPersonId && canLogFor(state.people[i])) {
        curOk = true;
        break;
      }
    }
    if (!curOk) state.currentPersonId = self.id;
    save(state);
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
    if (src.junior === true) p.junior = true;
    if (typeof src.parentId === "string" && src.parentId) p.parentId = src.parentId;
    if (typeof src.memberId === "string" && src.memberId) p.memberId = src.memberId;
    if (typeof src.email === "string" && src.email) p.email = src.email;
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

  function nameSortKey(name) {
    var parts = String(name || "").replace(/\s+/g, " ").trim().split(" ");
    if (!parts[0]) return { last: "", first: "" };
    if (parts.length === 1) return { last: parts[0].toLowerCase(), first: "" };
    return {
      last: parts[parts.length - 1].toLowerCase(),
      first: parts.slice(0, -1).join(" ").toLowerCase()
    };
  }

  function comparePeopleByName(a, b) {
    var ka = nameSortKey(personNameOf(a));
    var kb = nameSortKey(personNameOf(b));
    if (ka.last < kb.last) return -1;
    if (ka.last > kb.last) return 1;
    if (ka.first < kb.first) return -1;
    if (ka.first > kb.first) return 1;
    return 0;
  }

  function optionLabel(person) {
    var n = displayName(person);
    if (person && person.junior === true) return n + " (junior)";
    return n;
  }

  function currentAdultId() {
    var me = myMember();
    if (me && me.id) return me.id;
    var cur = currentPerson();
    if (!cur) return "";
    if (cur.junior === true && cur.parentId) return cur.parentId;
    return cur.memberId || cur.id;
  }

  function peopleForDropdown() {
    var people = state.people || [];
    var out = [];
    var seen = {};
    var i;
    var cur = currentPerson();
    if (!clubVisible()) {
      if (cur) out.push(cur);
      return out;
    }
    var me = myMember();
    var meId = me && me.id;
    for (i = 0; i < people.length; i++) {
      var p = people[i];
      if (!p || !p.id || seen[p.id]) continue;
      if (!canLogFor(p)) continue;
      seen[p.id] = true;
      out.push(p);
    }
    if (!out.length && cur) out.push(cur);
    out.sort(comparePeopleByName);
    return out;
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

  function prettyDateTime(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) {
      var raw = String(iso);
      if (raw.length >= 10) return prettyDateShort(raw.slice(0, 10));
      return raw;
    }
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var h = d.getHours();
    var m = d.getMinutes();
    var ampm = h >= 12 ? "PM" : "AM";
    var h12 = h % 12;
    if (!h12) h12 = 12;
    var mins = m < 10 ? "0" + m : String(m);
    return months[d.getMonth()] + " " + d.getDate() + ", " + h12 + ":" + mins + " " + ampm;
  }

  function isoDay(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) {
      var raw = String(iso);
      return raw.length >= 10 ? raw.slice(0, 10) : raw;
    }
    return d.getFullYear() + "-" + padNum(d.getMonth() + 1) + "-" + padNum(d.getDate());
  }

  function kneeboardLoggedAt(day) {
    if (!day) return new Date().toISOString();
    if (day === todayISO()) return new Date().toISOString();
    return day + "T16:00:00.000Z";
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

  function newUuid() {
    try {
      if (window.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    } catch (err) {}
    var bytes = new Uint8Array(16);
    var i;
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else for (i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    var hex = "";
    for (i = 0; i < 16; i++) hex += ("0" + bytes[i].toString(16)).slice(-2);
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
  }

  function isUuid(s) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s || ""));
  }

  function newSetId() {
    return newUuid();
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
    var v = typeof n === "number" ? n : parseFloat(n);
    if (isNaN(v)) return n == null ? "" : String(n);
    return String(v);
  }

  function speedIndex(mph) {
    var i = SLALOM_MPHS.indexOf(parseInt(mph, 10));
    return i < 0 ? 0 : i;
  }

  function lineIndex(off) {
    var i = SLALOM_OFFS.indexOf(parseInt(off, 10));
    return i < 0 ? 0 : i;
  }

  /* Score: faster boat first, then shorter line (more off), then buoys.
     Same line: 4 @ 30 mph beats 6 @ 28 mph. After 36 mph, more off is harder. */
  function chartScore(set) {
    if (!set) return 0;
    var buoys = typeof set.buoys === "number" ? set.buoys : parseFloat(set.buoys);
    if (isNaN(buoys)) buoys = 0;
    return speedIndex(set.mph) * (SLALOM_OFFS.length * 6) + lineIndex(set.off) * 6 + buoys;
  }

  function formatChart(n) {
    var v = typeof n === "number" ? n : parseFloat(n);
    if (isNaN(v)) return "—";
    return String(v);
  }

  function chartText(set) {
    if (!set) return "—";
    return formatChart(chartScore(set));
  }

  function passLabel(set) {
    if (!set) return "";
    return formatBuoys(set.buoys) + " @ " + setupShort(set);
  }

  function compareSetsDesc(a, b) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    var ca = chartScore(a);
    var cb = chartScore(b);
    if (ca !== cb) return cb - ca;
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

  function clubPeople() {
    var people = state.people || [];
    if (!clubVisible()) return people;
    var out = [];
    var i;
    for (i = 0; i < people.length; i++) {
      if (canLogFor(people[i])) out.push(people[i]);
    }
    return out;
  }

  function allSets() {
    var out = [];
    var people = clubPeople();
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
    var people = clubPeople();
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

  function addMonthsISO(iso, months) {
    var p = (iso || "").split("-");
    var y = parseInt(p[0], 10);
    var m = parseInt(p[1], 10);
    var day = parseInt(p[2], 10);
    if (!y || !m || !day) return iso;
    var idx = y * 12 + (m - 1) + months;
    var ny = Math.floor(idx / 12);
    var nm = idx - ny * 12 + 1;
    var dim = new Date(ny, nm, 0).getDate();
    var nd = day > dim ? dim : day;
    return ny + "-" + padNum(nm) + "-" + padNum(nd);
  }

  function skierDayDates(person) {
    var seen = {};
    var out = [];
    var sets = (person && person.slalomSets) || [];
    var i;
    for (i = 0; i < sets.length; i++) {
      var d = sets[i].date;
      if (d && !seen[d]) {
        seen[d] = true;
        out.push(d);
      }
    }
    return out;
  }

  function latestSkierDate(person) {
    var dates = skierDayDates(person);
    var max = "";
    var i;
    for (i = 0; i < dates.length; i++) {
      if (dates[i] > max) max = dates[i];
    }
    return max || null;
  }

  function priorDayCharts(person, beforeDate) {
    if (!person || !beforeDate) return [];
    var start = addMonthsISO(beforeDate, -12);
    var dates = skierDayDates(person);
    var charts = [];
    var i;
    for (i = 0; i < dates.length; i++) {
      var d = dates[i];
      if (d >= start && d < beforeDate) {
        var best = bestSetOnDate(person, d);
        if (best) charts.push(chartScore(best));
      }
    }
    charts.sort(function (a, b) {
      return b - a;
    });
    return charts;
  }

  function twoBestAverage(person, beforeDate) {
    var charts = priorDayCharts(person, beforeDate);
    if (charts.length < 2) return null;
    return (charts[0] + charts[1]) / 2;
  }

  function formatDelta(n) {
    if (typeof n !== "number" || isNaN(n)) return "—";
    var rounded = Math.round(n * 10) / 10;
    if (rounded === 0) return "0";
    var abs = Math.abs(rounded);
    var text = abs % 1 === 0 ? String(abs) : abs.toFixed(1);
    return (rounded > 0 ? "+" : "\u2212") + text;
  }

  function deltaVsDate(person, date) {
    if (!person || !date) return null;
    var avg = twoBestAverage(person, date);
    if (avg == null) return null;
    var best = bestSetOnDate(person, date);
    if (!best) return null;
    return chartScore(best) - avg;
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
        slSub.textContent = setupShort(best) + " · score " + chartText(best);
        slSub.hidden = false;
      }
    }
    paintSlalomBest();
  }

  function paintSlalomBest() {
    var num = document.getElementById("slalom-best-number");
    var setup = document.getElementById("slalom-best-setup");
    var chartEl = document.getElementById("slalom-best-chart");
    var best = bestSet();
    if (num) num.textContent = best ? formatBuoys(best.buoys) : "—";
    if (setup) setup.textContent = best ? setupShort(best) : "";
    if (chartEl) {
      chartEl.textContent = best ? ("Score " + chartText(best)) : "";
      chartEl.hidden = !best;
    }
  }

  function trophyDefById(id) {
    var i;
    for (i = 0; i < TROPHY_DEFS.length; i++) {
      if (TROPHY_DEFS[i].id === id) return TROPHY_DEFS[i];
    }
    return null;
  }

  function trophyIconSvg(icon, earned) {
    var stroke = earned ? "#FC5200" : "#9AA3AF";
    var fill = earned ? "#FC5200" : "none";
    var soft = earned ? "#FFE4D4" : "#EEF3F8";
    var gold = earned ? "#E7C56A" : "#C5CCD6";
    var navy = earned ? "#28203C" : "#9AA3AF";
    var common = ' viewBox="0 0 64 64" width="56" height="56" aria-hidden="true"';
    if (icon === "sunrise") {
      return '<svg' + common + '>' +
        '<rect x="6" y="6" width="52" height="52" rx="14" fill="' + soft + '"/>' +
        '<path d="M12 40h40" stroke="' + navy + '" stroke-width="2.4" stroke-linecap="round"/>' +
        '<circle cx="32" cy="34" r="10" fill="' + gold + '" stroke="' + navy + '" stroke-width="1.6"/>' +
        '<path d="M32 18v4M18 28l3 2M46 28l-3 2M22 20l2.5 2.5M42 20l-2.5 2.5" stroke="' + stroke + '" stroke-width="2" stroke-linecap="round"/>' +
        '</svg>';
    }
    if (icon === "flame") {
      return '<svg' + common + '>' +
        '<rect x="6" y="6" width="52" height="52" rx="14" fill="' + soft + '"/>' +
        '<path d="M32 16c6 8 14 12 14 24a14 14 0 1 1-28 0c0-6 4-10 7-14 1 5 4 7 7 7 0-6 0-11 0-17z" fill="' + fill + '" stroke="' + navy + '" stroke-width="1.6" stroke-linejoin="round"/>' +
        '</svg>';
    }
    if (icon === "heli") {
      return '<svg' + common + '>' +
        '<rect x="6" y="6" width="52" height="52" rx="14" fill="' + soft + '"/>' +
        '<path d="M16 30c8-10 24-10 32 0" fill="none" stroke="' + stroke + '" stroke-width="3" stroke-linecap="round"/>' +
        '<path d="M20 38c6 6 18 6 24 0" fill="none" stroke="' + navy + '" stroke-width="2.4" stroke-linecap="round"/>' +
        '<circle cx="32" cy="34" r="4" fill="' + gold + '" stroke="' + navy + '" stroke-width="1.5"/>' +
        '</svg>';
    }
    if (icon === "stack") {
      return '<svg' + common + '>' +
        '<rect x="6" y="6" width="52" height="52" rx="14" fill="' + soft + '"/>' +
        '<rect x="18" y="36" width="28" height="8" rx="3" fill="' + gold + '" stroke="' + navy + '" stroke-width="1.5"/>' +
        '<rect x="20" y="28" width="24" height="8" rx="3" fill="' + soft + '" stroke="' + stroke + '" stroke-width="1.8"/>' +
        '<rect x="22" y="20" width="20" height="8" rx="3" fill="' + fill + '" stroke="' + navy + '" stroke-width="1.5"/>' +
        '</svg>';
    }
    if (icon === "camera") {
      return '<svg' + common + '>' +
        '<rect x="6" y="6" width="52" height="52" rx="14" fill="' + soft + '"/>' +
        '<rect x="14" y="24" width="36" height="24" rx="6" fill="' + (earned ? "#28203C" : "#C5CCD6") + '"/>' +
        '<path d="M22 24l3-5h14l3 5" fill="' + gold + '"/>' +
        '<circle cx="32" cy="36" r="7" fill="' + soft + '" stroke="' + stroke + '" stroke-width="2.2"/>' +
        '<circle cx="32" cy="36" r="3.2" fill="' + stroke + '"/>' +
        '</svg>';
    }
    /* wake / default */
    return '<svg' + common + '>' +
      '<rect x="6" y="6" width="52" height="52" rx="14" fill="' + soft + '"/>' +
      '<path d="M12 38c8-2 12-10 20-10s12 8 20 10" fill="none" stroke="' + navy + '" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M18 30c6-8 14-12 22-8" fill="none" stroke="' + stroke + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<circle cx="40" cy="22" r="3.2" fill="' + gold + '"/>' +
      '</svg>';
  }

  function paintShelf() {
    var list = document.getElementById("trophy-shelf");
    var empty = document.getElementById("trophy-empty");
    var caption = document.getElementById("trophy-caption");
    if (!list) return;
    var earnedMap = {};
    var trophies = personTrophies();
    var i;
    for (i = 0; i < trophies.length; i++) {
      earnedMap[trophies[i].id] = trophies[i];
    }
    if (empty) empty.hidden = true;
    var html = "";
    var focusId = "";
    for (i = 0; i < TROPHY_DEFS.length; i++) {
      var def = TROPHY_DEFS[i];
      var earnedRow = earnedMap[def.id];
      var earned = !!earnedRow;
      if (!focusId && earned) focusId = def.id;
      html += '<li class="trophy-card' + (earned ? " is-earned" : " is-locked") + '" data-id="' + escapeHtml(def.id) + '" role="button" tabindex="0" aria-pressed="false">';
      html += '<div class="trophy-plate">';
      html += '<span class="trophy-medal">' + trophyIconSvg(def.icon, earned) + "</span>";
      if (earned) html += '<span class="trophy-badge">Earned</span>';
      else html += '<span class="trophy-badge is-lock">Locked</span>';
      html += "</div>";
      html += '<span class="trophy-title">' + escapeHtml(def.title) + "</span>";
      if (earned && earnedRow.earned) {
        html += '<time class="trophy-when" datetime="' + escapeHtml(earnedRow.earned) + '">' +
          escapeHtml(prettyDate(earnedRow.earned)) + "</time>";
      } else {
        html += '<span class="trophy-how">' + escapeHtml(def.how || "") + "</span>";
      }
      html += "</li>";
    }
    list.innerHTML = html;
    if (!focusId && TROPHY_DEFS.length) focusId = TROPHY_DEFS[0].id;
    focusTrophyCard(focusId, true);
    bindTrophyShelf();
  }

  function focusTrophyCard(id, silent) {
    var list = document.getElementById("trophy-shelf");
    var caption = document.getElementById("trophy-caption");
    if (!list) return;
    var cards = list.querySelectorAll(".trophy-card");
    var i;
    var active = null;
    for (i = 0; i < cards.length; i++) {
      var on = cards[i].getAttribute("data-id") === id;
      cards[i].classList.toggle("is-center", on);
      cards[i].setAttribute("aria-pressed", on ? "true" : "false");
      if (on) active = cards[i];
    }
    var def = trophyDefById(id);
    if (caption && def) {
      var earnedRow = null;
      var trophies = personTrophies();
      for (i = 0; i < trophies.length; i++) {
        if (trophies[i].id === id) { earnedRow = trophies[i]; break; }
      }
      caption.hidden = false;
      caption.innerHTML =
        '<p class="trophy-cap-kicker">' + (earnedRow ? "Earned" : "Locked") + "</p>" +
        '<p class="trophy-cap-title">' + escapeHtml(def.title) + "</p>" +
        '<p class="trophy-cap-body">' + escapeHtml(def.how || "") +
        (earnedRow && earnedRow.earned ? (" · " + escapeHtml(prettyDate(earnedRow.earned))) : "") +
        "</p>";
    }
    if (active && !silent && active.scrollIntoView) {
      active.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }

  function bindTrophyShelf() {
    var list = document.getElementById("trophy-shelf");
    if (!list || list.getAttribute("data-bound")) return;
    list.setAttribute("data-bound", "1");
    list.addEventListener("click", function (e) {
      var card = e.target.closest ? e.target.closest(".trophy-card") : null;
      if (!card) return;
      focusTrophyCard(card.getAttribute("data-id"), false);
    });
    list.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var card = e.target.closest ? e.target.closest(".trophy-card") : null;
      if (!card) return;
      e.preventDefault();
      focusTrophyCard(card.getAttribute("data-id"), false);
    });
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
    var target = null;
    var i;
    for (i = 0; i < people.length; i++) {
      if (people[i].id === id) {
        found = true;
        target = people[i];
        break;
      }
    }
    if (!found) return;
    if (!canLogFor(target)) return;
    state.currentPersonId = id;
    save(state);
    paintNameField();
    paintUnits();
    paintScore();
    paintShelf();
    renderAll();
  }

  function autoSelectMemberByEmail() {
    var email = String(window.LAKE_USER_EMAIL || "").trim().toLowerCase();
    if (!email) return;
    var people = state.people || [];
    var match = null;
    var i;
    for (i = 0; i < people.length; i++) {
      if (String(people[i].email || "").trim().toLowerCase() === email) {
        match = people[i];
        break;
      }
    }
    if (!match) return;
    var cur = currentPerson();
    if (cur && cur.id === match.id) return;
    if (cur && cur.junior === true) {
      var parent = window.LAKE_USER_ID || match.id;
      if (cur.parentId === parent || cur.parentId === match.id) return;
    }
    state.currentPersonId = match.id;
    save(state);
  }

  var state = load();
  ensureSeedSkiers();
  syncClubPeople();

  var draftBuoys = null;

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

  /* ---- club-shared kneeboard trick photos (Supabase Storage) ---- */

  var photoMetaByLogId = {};
  var photoLightboxState = { logId: "", sport: "", trickId: "", btn: null, url: "", canEdit: false, objectPath: "" };
  var photoLightboxLastFocus = null;
  var photoOutputTypeCache = null;

  function latestHostedKneeboardLogId(entry) {
    if (!entry || !Array.isArray(entry.remoteIds)) return "";
    var i;
    for (i = entry.remoteIds.length - 1; i >= 0; i--) {
      if (isUuid(entry.remoteIds[i])) return entry.remoteIds[i];
    }
    return "";
  }

  function hostedLogIdForTrick(sport, trickId) {
    if (sport !== "kneeboard") return "";
    return latestHostedKneeboardLogId(getEntry(sport, trickId));
  }

  function rememberPhotoMeta(meta) {
    if (!meta || !meta.kneeboard_log_id) return;
    var id = String(meta.kneeboard_log_id);
    photoMetaByLogId[id] = {
      id: meta.id || (photoMetaByLogId[id] && photoMetaByLogId[id].id) || "",
      kneeboard_log_id: id,
      club_id: meta.club_id || "",
      member_id: meta.member_id || "",
      object_path: meta.object_path || meta.photo_path || "",
      can_edit: meta.can_edit === true
    };
  }

  function clearPhotoMeta(logId) {
    if (!logId) return;
    delete photoMetaByLogId[String(logId)];
  }

  // Personal Mini no longer refreshes a Recent logs board; Club page owns activity.
  function afterHostChange() {}


  function photoIconSvg(filled) {
    if (filled) {
      return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
        '<path d="M8.6 7.4h1.05l.72-1.2h3.26l.72 1.2h1.05A1.75 1.75 0 0 1 17 9.15v5.9A1.75 1.75 0 0 1 15.25 16.8H8.75A1.75 1.75 0 0 1 7 15.05v-5.9A1.75 1.75 0 0 1 8.6 7.4Z" fill="#FFFFFF"/>' +
        '<circle cx="12" cy="12.1" r="2.15" fill="var(--accent)"/>' +
        "</svg>";
    }
    return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
      '<path d="M8.6 7.4h1.05l.72-1.2h3.26l.72 1.2h1.05A1.75 1.75 0 0 1 17 9.15v5.9A1.75 1.75 0 0 1 15.25 16.8H8.75A1.75 1.75 0 0 1 7 15.05v-5.9A1.75 1.75 0 0 1 8.6 7.4Z" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
      '<circle cx="12" cy="12.1" r="2.15" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
      "</svg>";
  }

  function renderPhotoButton(sport, trickId, logId) {
    var idAttr = escapeHtml(trickId);
    var logAttr = escapeHtml(logId || "");
    return '<span class="trick-photo-wrap">' +
      '<button type="button" class="trick-photo-btn is-empty" data-act="photo" data-sport="' + sport +
      '" data-id="' + idAttr + '" data-log-id="' + logAttr + '" aria-label="Add trick photo">' +
      '<span class="trick-photo-icon">' + photoIconSvg(false) + "</span>" +
      "</button>" +
      '<input type="file" accept="image/*" class="trick-photo-input" data-sport="' + sport +
      '" data-id="' + idAttr + '" data-log-id="' + logAttr + '" hidden>' +
      "</span>";
  }

  function setPhotoButtonState(btn, filled) {
    if (!btn) return;
    btn.classList.toggle("is-filled", !!filled);
    btn.classList.toggle("is-empty", !filled);
    btn.setAttribute("aria-label", filled ? "View trick photo" : "Add trick photo");
    var icon = btn.querySelector(".trick-photo-icon");
    if (icon) icon.innerHTML = photoIconSvg(!!filled);
  }

  function setLightboxEditControls(canEdit) {
    var actions = document.querySelector(".photo-lightbox-actions");
    if (actions) actions.hidden = !canEdit;
    if (!canEdit) {
      var confirmBlock = document.getElementById("photo-lightbox-confirm");
      if (confirmBlock) confirmBlock.hidden = true;
    } else {
      resetPhotoLightboxConfirm();
    }
  }

  function supportsWebpEncode() {
    try {
      var c = document.createElement("canvas");
      c.width = 1;
      c.height = 1;
      return c.toDataURL("image/webp").indexOf("data:image/webp") === 0;
    } catch (err) {
      return false;
    }
  }

  function photoOutputType() {
    if (!photoOutputTypeCache) {
      photoOutputTypeCache = supportsWebpEncode() ? "image/webp" : "image/jpeg";
    }
    return photoOutputTypeCache;
  }

  function decodeViaImageElement(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("decode failed"));
      };
      img.src = url;
    });
  }

  function decodeImageBitmap(file) {
    var bitmapPromise = null;
    if (typeof createImageBitmap === "function") {
      try {
        bitmapPromise = createImageBitmap(file, { imageOrientation: "from-image" });
      } catch (err) {
        try {
          bitmapPromise = createImageBitmap(file);
        } catch (err2) {
          bitmapPromise = null;
        }
      }
      if (bitmapPromise && typeof bitmapPromise.then === "function") {
        return bitmapPromise.catch(function () {
          return createImageBitmap(file).catch(function () {
            return decodeViaImageElement(file);
          });
        });
      }
    }
    return decodeViaImageElement(file);
  }

  function fileLooksLikeImage(file) {
    if (!file) return false;
    var type = String(file.type || "").toLowerCase();
    if (type.indexOf("image/") === 0) return true;
    return /\.(jpe?g|png|gif|webp|heic|heif|bmp|tif?f)$/i.test(String(file.name || ""));
  }

  function processPhotoFile(file) {
    if (!fileLooksLikeImage(file)) {
      return Promise.reject({ code: "not-image", message: "Please choose a photo (JPEG, PNG, HEIC, etc)." });
    }
    if (file.size > PHOTO_MAX_INPUT_BYTES) {
      return Promise.reject({ code: "too-large", message: "That photo is larger than 15MB. Choose a smaller one." });
    }
    return decodeImageBitmap(file).catch(function () {
      throw { code: "decode-failed", message: "Couldn\u2019t read that photo. If it\u2019s HEIC, try JPEG or turn off iPhone High Efficiency." };
    }).then(function (bitmap) {
      var w0 = bitmap.width || bitmap.naturalWidth || 0;
      var h0 = bitmap.height || bitmap.naturalHeight || 0;
      if (!w0 || !h0) {
        throw { code: "decode-failed", message: "Couldn\u2019t read that photo. Try a different file." };
      }
      var scale = Math.min(1, PHOTO_MAX_DIMENSION / Math.max(w0, h0));
      var outW = Math.max(1, Math.round(w0 * scale));
      var outH = Math.max(1, Math.round(h0 * scale));
      var canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      var ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0, outW, outH);
      if (bitmap.close) {
        try { bitmap.close(); } catch (err) {}
      }
      var type = photoOutputType();
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (!blob) {
            reject({ code: "encode-failed", message: "Couldn\u2019t process that photo. Try again." });
            return;
          }
          resolve({ blob: blob, type: blob.type || type, width: outW, height: outH });
        }, type, PHOTO_QUALITY);
      });
    });
  }

  function refreshPhotoMetaForLogIds(ids) {
    var uniq = [];
    var seen = {};
    var i;
    for (i = 0; i < (ids || []).length; i++) {
      var id = ids[i];
      if (!isUuid(id) || seen[id]) continue;
      seen[id] = true;
      uniq.push(id);
    }
    if (!uniq.length || !hostEnabled() || !window.LakeClub.kneeboardPhotosForLogs) {
      return Promise.resolve([]);
    }
    return window.LakeClub.kneeboardPhotosForLogs(window.LAKE_SB, uniq).then(function (data) {
      if (!data || data.ok === false) return [];
      var photos = Array.isArray(data.photos) ? data.photos : [];
      for (i = 0; i < photos.length; i++) rememberPhotoMeta(photos[i]);
      return photos;
    }).catch(function () { return []; });
  }

  function fillTrickPhotos(sport) {
    if (sport !== "kneeboard") return;
    var btns = document.querySelectorAll("#list-" + sport + " .trick-photo-btn");
    if (!btns.length) return;
    var ids = [];
    var i;
    for (i = 0; i < btns.length; i++) {
      var logId = btns[i].getAttribute("data-log-id") || hostedLogIdForTrick(sport, btns[i].getAttribute("data-id"));
      if (logId) {
        btns[i].setAttribute("data-log-id", logId);
        ids.push(logId);
      }
      setPhotoButtonState(btns[i], !!(logId && photoMetaByLogId[logId] && photoMetaByLogId[logId].object_path));
    }
    if (!hostEnabled()) return;
    refreshPhotoMetaForLogIds(ids).then(function () {
      for (i = 0; i < btns.length; i++) {
        var lid = btns[i].getAttribute("data-log-id");
        setPhotoButtonState(btns[i], !!(lid && photoMetaByLogId[lid] && photoMetaByLogId[lid].object_path));
      }
    });
  }

  function signedUrlForPath(objectPath) {
    if (!window.LAKE_SB || !objectPath) {
      return Promise.reject(new Error("missing path"));
    }
    return window.LAKE_SB.storage.from(PHOTO_BUCKET).createSignedUrl(objectPath, 120).then(function (res) {
      if (res.error || !res.data || !res.data.signedUrl) {
        throw res.error || new Error("signed url failed");
      }
      return res.data.signedUrl;
    });
  }

  function uploadProcessedPhoto(logId, processed) {
    var preparedPath = "";
    return window.LakeClub.prepareKneeboardPhoto(window.LAKE_SB, logId).then(function (prep) {
      if (!prep || prep.ok === false) {
        throw { code: (prep && prep.code) || "prepare", message: (prep && prep.error) || "Couldn\u2019t prepare that upload." };
      }
      preparedPath = prep.object_path;
      var type = processed.type || "image/webp";
      if (type === "image/jpeg" && /\.webp$/i.test(preparedPath)) {
        preparedPath = preparedPath.replace(/\.webp$/i, ".jpg");
      }
      return window.LAKE_SB.storage.from(PHOTO_BUCKET).upload(preparedPath, processed.blob, {
        contentType: type,
        upsert: false
      }).then(function (up) {
        if (up.error) throw up.error;
        return window.LakeClub.registerKneeboardPhoto(window.LAKE_SB, logId, preparedPath, type);
      }).then(function (reg) {
        if (!reg || reg.ok === false) {
          if (window.LakeClub.rollbackKneeboardPhotoUpload) {
            window.LakeClub.rollbackKneeboardPhotoUpload(window.LAKE_SB, preparedPath).catch(function () {});
          }
          throw { code: (reg && reg.code) || "register", message: (reg && reg.error) || "Couldn\u2019t save that photo." };
        }
        rememberPhotoMeta(reg);
        return reg;
      });
    }).catch(function (err) {
      if (preparedPath && window.LakeClub && window.LakeClub.rollbackKneeboardPhotoUpload) {
        window.LakeClub.rollbackKneeboardPhotoUpload(window.LAKE_SB, preparedPath).catch(function () {});
      }
      throw err;
    });
  }

  function ensureHostedKneeboardLogForPhoto(sport, trickId, logId) {
    var person = currentPerson();
    var mid = memberIdFor(person);
    var entry = ensureEntry(sport, trickId);
    if (!Array.isArray(entry.remoteIds)) entry.remoteIds = [];
    if (entry.remoteIds.indexOf(logId) === -1) {
      entry.remoteIds.push(logId);
      save(state);
    }
    var day = (entry.dates && entry.dates.length) ? entry.dates[entry.dates.length - 1] : todayISO();
    return window.LakeClub.logKneeboard(window.LAKE_SB, {
      id: logId,
      memberId: mid,
      trickName: trickNameOf(sport, trickId),
      mode: modeOf(sport, trickId),
      loggedAt: kneeboardLoggedAt(day)
    }).then(function (res) {
      if (res && res.ok === false) {
        throw { code: res.code || "host", message: res.error || "Couldn\u2019t host that log." };
      }
      return logId;
    });
  }

  function handleTrickPhotoFile(sport, trickId, file, btn, onSaved) {
    if (!hostEnabled()) {
      showToast("log", PHOTO_JOIN_TOAST);
      return;
    }
    var person = currentPerson();
    if (!canLogFor(person)) {
      showToast("log", "You can only log your sets and your juniors.");
      return;
    }
    var logId = (btn && btn.getAttribute("data-log-id")) || hostedLogIdForTrick(sport, trickId);
    if (!isUuid(logId)) {
      showToast("log", PHOTO_JOIN_TOAST);
      return;
    }
    processPhotoFile(file).then(function (processed) {
      return ensureHostedKneeboardLogForPhoto(sport, trickId, logId).then(function () {
        return uploadProcessedPhoto(logId, processed);
      });
    }).then(function () {
      setPhotoButtonState(btn, true);
      showToast("log", "Photo shared with your club");
      afterProgress({ hasMedia: true });
      afterHostChange();
      renderSport(sport);
      if (typeof onSaved === "function") onSaved(logId);
    }).catch(function (err) {
      var msg = (err && err.message) || "Couldn\u2019t save that photo.";
      showToast("log", msg);
    });
  }

  function photoLightboxFocusables() {
    var dlg = document.getElementById("photo-lightbox");
    if (!dlg) return [];
    var nodes = dlg.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
    var out = [];
    var i;
    for (i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.hidden) continue;
      if (n.closest && n.closest("[hidden]")) continue;
      out.push(n);
    }
    return out;
  }

  function onPhotoLightboxKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closePhotoLightbox();
      return;
    }
    if (e.key === "Tab") {
      var focusables = photoLightboxFocusables();
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function resetPhotoLightboxConfirm() {
    var confirmBlock = document.getElementById("photo-lightbox-confirm");
    var actions = document.querySelector(".photo-lightbox-actions");
    if (confirmBlock) confirmBlock.hidden = true;
    if (actions && photoLightboxState.canEdit) actions.hidden = false;
  }

  function closePhotoLightbox() {
    var dlg = document.getElementById("photo-lightbox");
    var scrim = document.getElementById("photo-lightbox-scrim");
    var img = document.getElementById("photo-lightbox-img");
    if (dlg) dlg.hidden = true;
    if (scrim) scrim.hidden = true;
    if (img) {
      img.removeAttribute("src");
      img.alt = "";
    }
    photoLightboxState.url = "";
    resetPhotoLightboxConfirm();
    document.body.classList.remove("photo-lightbox-open");
    document.removeEventListener("keydown", onPhotoLightboxKeydown, true);
    var restore = photoLightboxLastFocus;
    photoLightboxState = { logId: "", sport: "", trickId: "", btn: null, url: "", canEdit: false, objectPath: "" };
    photoLightboxLastFocus = null;
    if (restore && typeof restore.focus === "function") {
      try { restore.focus(); } catch (err) {}
    }
  }

  function openPhotoLightboxForLog(logId, triggerBtn, sport, trickId) {
    if (!hostEnabled() || !window.LakeClub.viewKneeboardPhoto) {
      showToast("log", PHOTO_JOIN_TOAST);
      return;
    }
    if (!isUuid(logId)) {
      showToast("log", "No photo saved yet.");
      return;
    }
    window.LakeClub.viewKneeboardPhoto(window.LAKE_SB, logId).then(function (meta) {
      if (!meta || meta.ok === false) {
        showToast("log", (meta && meta.error) || "No photo saved yet.");
        return null;
      }
      rememberPhotoMeta(meta);
      return signedUrlForPath(meta.object_path).then(function (url) {
        return { meta: meta, url: url };
      });
    }).then(function (pack) {
      if (!pack) return;
      var dlg = document.getElementById("photo-lightbox");
      var scrim = document.getElementById("photo-lightbox-scrim");
      var img = document.getElementById("photo-lightbox-img");
      if (!dlg || !scrim || !img) return;
      photoLightboxLastFocus = triggerBtn || document.activeElement;
      photoLightboxState = {
        logId: logId,
        sport: sport || "",
        trickId: trickId || "",
        btn: triggerBtn || null,
        url: pack.url,
        canEdit: pack.meta.can_edit === true,
        objectPath: pack.meta.object_path || ""
      };
      img.src = pack.url;
      img.alt = (trickId ? trickNameOf(sport || "kneeboard", trickId) : "Trick") + " photo";
      setLightboxEditControls(photoLightboxState.canEdit);
      dlg.hidden = false;
      scrim.hidden = false;
      document.body.classList.add("photo-lightbox-open");
      document.addEventListener("keydown", onPhotoLightboxKeydown, true);
      var closeBtn = document.getElementById("photo-lightbox-close");
      if (closeBtn && closeBtn.focus) closeBtn.focus();
    }).catch(function () {
      showToast("log", "Couldn\u2019t open that photo.");
    });
  }

  function openPhotoLightbox(sport, trickId, triggerBtn) {
    var logId = (triggerBtn && triggerBtn.getAttribute("data-log-id")) || hostedLogIdForTrick(sport, trickId);
    openPhotoLightboxForLog(logId, triggerBtn, sport, trickId);
  }

  /* ---- render ---- */

  var kbQuery = "";

  function trickDiff(item) {
    if (!item) return 4;
    if (typeof item.diff === "number") return item.diff;
    return item.mode === "hard" ? 8 : 4;
  }

  function workingBand() {
    var items = itemsFor("kneeboard");
    var diffs = [];
    var i;
    for (i = 0; i < items.length; i++) {
      if (isLanded(getEntry("kneeboard", items[i].id))) diffs.push(trickDiff(items[i]));
    }
    if (!diffs.length) return 3;
    diffs.sort(function (a, b) { return a - b; });
    var top = diffs.slice(Math.max(0, diffs.length - 3));
    var sum = 0;
    for (i = 0; i < top.length; i++) sum += top[i];
    return Math.max(1, Math.min(10, Math.round(sum / top.length)));
  }

  function pickNear(landedWanted, band, limit) {
    var items = itemsFor("kneeboard");
    var scored = [];
    var customs = [];
    var i;
    for (i = 0; i < items.length; i++) {
      var landed = isLanded(getEntry("kneeboard", items[i].id));
      if (landed !== landedWanted) continue;
      if (landedWanted && items[i].custom) {
        customs.push(items[i]);
        continue;
      }
      var d = trickDiff(items[i]);
      scored.push({ item: items[i], dist: Math.abs(d - band), d: d });
    }
    scored.sort(function (a, b) {
      if (a.dist !== b.dist) return a.dist - b.dist;
      return landedWanted ? (b.d - a.d) : (a.d - b.d);
    });
    var out = [];
    var seen = {};
    if (landedWanted) {
      for (i = 0; i < customs.length && out.length < limit; i++) {
        out.push(customs[i]);
        seen[customs[i].id] = true;
      }
    }
    for (i = 0; i < scored.length && out.length < limit; i++) {
      if (seen[scored[i].item.id]) continue;
      out.push(scored[i].item);
      seen[scored[i].item.id] = true;
    }
    return out;
  }

  function searchTricks(q) {
    q = String(q || "").toLowerCase();
    if (!q) return [];
    var items = itemsFor("kneeboard");
    var hits = [];
    var i;
    for (i = 0; i < items.length; i++) {
      if (String(items[i].name || "").toLowerCase().indexOf(q) !== -1) hits.push(items[i]);
    }
    return hits;
  }

  function findTrickByName(name) {
    var q = String(name || "").toLowerCase();
    var items = itemsFor("kneeboard");
    var i;
    for (i = 0; i < items.length; i++) {
      if (String(items[i].name || "").toLowerCase() === q) return items[i];
    }
    return null;
  }

  function renderTrickRow(item, sport) {
    var entry = getEntry(sport, item.id);
    var landed = isLanded(entry);
    var custom = !!item.custom;
    var d = trickDiff(item);
    var classes = "trick-item" + (landed ? " is-done" : " is-try") + (custom ? " is-custom" : "");
    var html = '<li class="' + classes + '" data-sport="' + sport + '" data-id="' + escapeHtml(item.id) + '">';
    html += '<div class="trick-main">';
    html += '<label class="trick-label">';
    html += '<input type="checkbox" data-act="land" data-sport="' + sport + '" data-id="' + escapeHtml(item.id) + '"' + (landed ? " checked" : "") + ">";
    html += '<span class="name">' + escapeHtml(item.name);
    if (custom) html += '<span class="write-in">Write-in</span>';
    html += '<span class="kb-diff">' + d + "</span>";
    html += "</span></label></div>";
    var sideHtml = "";
    if (custom) {
      sideHtml += '<button type="button" class="remove" data-act="remove" data-sport="' + sport + '" data-id="' + escapeHtml(item.id) + '">Remove</button>';
    }
    if (landed && sport === "kneeboard") {
      sideHtml += renderPhotoButton(sport, item.id, hostedLogIdForTrick(sport, item.id));
    }
    if (sideHtml) {
      html += '<div class="trick-side">' + sideHtml + "</div>";
    }
    html += "</li>";
    return html;
  }

  function renderSport(sport) {
    if (sport !== "kneeboard") return;
    var list = document.getElementById("list-" + sport);
    var band = workingBand();
    var q = kbQuery;
    var html = "";
    var i;
    if (q) {
      var hits = searchTricks(q);
      html += '<li class="trick-group">Search</li>';
      if (!hits.length) {
        html += '<li class="trick-item"><div class="trick-main"><span class="name">No hive match. Log it to add a write-in.</span></div></li>';
      } else {
        for (i = 0; i < hits.length && i < 8; i++) html += renderTrickRow(hits[i], sport);
      }
    } else {
      var landed = pickNear(true, band, 3);
      var trying = pickNear(false, band, 3);
      html += '<li class="trick-group">Landed near you</li>';
      if (!landed.length) {
        html += '<li class="trick-item"><div class="trick-main"><span class="name">Nothing landed in this band yet. Log one below.</span></div></li>';
      } else {
        for (i = 0; i < landed.length; i++) html += renderTrickRow(landed[i], sport);
      }
      html += '<li class="trick-group">Try next</li>';
      if (!trying.length) {
        html += '<li class="trick-item"><div class="trick-main"><span class="name">Search to add a trick at this level.</span></div></li>';
      } else {
        for (i = 0; i < trying.length; i++) html += renderTrickRow(trying[i], sport);
      }
    }
    list.innerHTML = html;
    updateProgress(sport);
    fillTrickPhotos(sport);
  }

  function updateProgress(sport) {
    if (sport !== "kneeboard") return;
    var band = workingBand();
    var card = document.querySelector('[data-progress="' + sport + '"]');
    if (!card) return;
    var counts = card.querySelector(".progress-counts");
    if (counts) counts.textContent = "Working range · " + band;
    var fill = card.querySelector(".lake-fill");
    if (fill) fill.style.width = (band * 10) + "%";
  }

  function setSelectedPass(off, mph) {
    var p = currentPerson();
    p.selectedPass = normalizePass(off, mph);
    save(state);
    renderSlalom();
  }

  function hostEnabled() {
    return !!(clubVisible() && window.LAKE_SB && window.LakeClub);
  }

  function memberIdFor(person) {
    return (person && person.memberId) || "";
  }

  function pushSlalomLog(person, row) {
    if (!hostEnabled() || !row || !isUuid(row.id)) return;
    var mid = memberIdFor(person);
    if (!mid) return;
    window.LakeClub.logSlalom(window.LAKE_SB, {
      id: row.id,
      memberId: mid,
      off: row.off,
      mph: row.mph,
      buoys: row.buoys,
      clubId: clubState().clubId
    }).catch(function () {});
  }

  function dropSlalomLog(id) {
    if (!hostEnabled() || !isUuid(id)) return;
    window.LakeClub.deleteSlalom(window.LAKE_SB, id, clubState().clubId).catch(function () {});
  }

  function dropKneeboardIds(ids) {
    if (!hostEnabled() || !ids || !ids.length) return;
    var jobs = [];
    var i;
    for (i = 0; i < ids.length; i++) {
      if (isUuid(ids[i])) jobs.push(window.LakeClub.deleteKneeboard(window.LAKE_SB, ids[i], clubState().clubId));
    }
    if (!jobs.length) return;
    Promise.all(jobs).catch(function () {});
  }

  function hostPushKneeboardNew(person, entry, index, trickName, mode) {
    if (!hostEnabled() || !entry) return;
    var mid = memberIdFor(person);
    if (!mid) return;
    if (!Array.isArray(entry.remoteIds)) entry.remoteIds = [];
    while (entry.remoteIds.length <= index) entry.remoteIds.push("");
    if (!isUuid(entry.remoteIds[index])) entry.remoteIds[index] = newUuid();
    var day = (entry.dates && entry.dates[index]) || todayISO();
    window.LakeClub.logKneeboard(window.LAKE_SB, {
      id: entry.remoteIds[index],
      memberId: mid,
      trickName: trickName,
      mode: mode === "hard" ? "hard" : "easy",
      loggedAt: kneeboardLoggedAt(day),
      clubId: clubState().clubId
    }).catch(function () {});
  }

  function hostUpdateKneeboard(person, entry, index, trickName, mode) {
    if (!hostEnabled() || !entry || !entry.remoteIds) return;
    if (!isUuid(entry.remoteIds[index])) return;
    var mid = memberIdFor(person);
    if (!mid) return;
    var day = (entry.dates && entry.dates[index]) || todayISO();
    window.LakeClub.logKneeboard(window.LAKE_SB, {
      id: entry.remoteIds[index],
      memberId: mid,
      trickName: trickName,
      mode: mode === "hard" ? "hard" : "easy",
      loggedAt: kneeboardLoggedAt(day),
      clubId: clubState().clubId
    }).catch(function () {});
  }

  function hostDropKneeboardEntry(entry) {
    dropKneeboardIds(entry && entry.remoteIds);
  }

  function trickNameOf(sport, id) {
    var item = findItem(sport, id);
    return (item && item.name) || id;
  }

  function paintSubmitSet() {
    var btn = document.getElementById("submit-set-btn");
    if (!btn) return;
    btn.disabled = parseBuoys(draftBuoys) == null;
  }

  function logSet(buoys) {
    var p = currentPerson();
    if (!canLogFor(p)) {
      showToast("log", "You can only log your sets and your juniors.");
      return;
    }
    if (!personNameOf(p)) {
      showToast("log", "Add a name to hit the board");
      focusNameField();
      return;
    }
    var n = parseBuoys(buoys);
    if (n == null) {
      showToast("log", "Pick a buoy count first");
      return;
    }
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
    pushSlalomLog(p, row);
    showToast("log", "Logged " + formatBuoys(n) + " @ " + setupShort(pass));
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
    dropSlalomLog(id);
  }

  function paintClubChrome() {
    var vis = clubVisible();
    var note = document.getElementById("club-signin-note");
    var session = document.getElementById("latest-session");
    var club = document.getElementById("club-board");
    var beat = document.getElementById("beat-board");
    var best = document.getElementById("best-board");
    var junior = document.getElementById("junior-block");
    var footer = document.querySelector("footer p");
    var kicker = document.querySelector("#club-board .board-kicker");
    var rosterKicker = document.querySelector("#club-roster-block .board-kicker");
    var name = liveClubName();
    if (note) note.hidden = vis;
    if (session) session.hidden = !vis;
    if (club) club.hidden = !vis;
    if (beat) beat.hidden = !vis;
    if (best) best.hidden = !vis;
    if (junior) junior.hidden = true;
    if (kicker) kicker.textContent = name;
    if (rosterKicker) rosterKicker.textContent = name;
    if (footer) {
      footer.textContent = vis
        ? "lake.world · " + name
        : "lake.world · this device only";
    }
    if (window.LakeClubUi && typeof window.LakeClubUi.paint === "function") {
      window.LakeClubUi.paint();
    }
  }

  function renderRoster() {
    var sel = document.getElementById("person-select");
    var field = document.getElementById("person-name");
    var vis = clubVisible();
    if (sel) sel.hidden = !vis;
    if (field) field.hidden = vis;
    if (vis && sel) {
      var people = peopleForDropdown();
      var cur = currentPerson();
      var curId = cur.id;
      var html = "";
      var i;
      var found = false;
      for (i = 0; i < people.length; i++) {
        var p = people[i];
        var on = p.id === curId;
        if (on) found = true;
        html += '<option value="' + escapeHtml(p.id) + '"' + (on ? " selected" : "") + ">" +
          escapeHtml(optionLabel(p)) + "</option>";
      }
      if (!found && cur) {
        html = '<option value="' + escapeHtml(curId) + '" selected>' +
          escapeHtml(optionLabel(cur)) + "</option>" + html;
      }
      sel.innerHTML = html;
    } else if (field && document.activeElement !== field) {
      var guest = currentPerson();
      field.value = (guest && guest.name) || "";
    }
  }

  function renderSession() {
    var list = document.getElementById("session-list");
    var empty = document.getElementById("session-empty");
    var head = document.getElementById("session-head");
    var heading = document.getElementById("latest-session-heading");
    if (!list) return;
    if (!clubVisible()) {
      list.innerHTML = "";
      if (empty) empty.hidden = true;
      if (head) head.hidden = true;
      return;
    }
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
    var people = clubPeople();
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
      var delta = deltaVsDate(r.person, date);
      var deltaClass = "board-delta" + (delta != null && delta > 0 ? " is-up" : "");
      html += '<li class="board-row' + (you ? " is-you" : "") + '">';
      html += '<div class="session-cols">';
      html += '<span class="board-name">' + escapeHtml(displayName(r.person)) + "</span>";
      html += '<span class="board-pass">' + escapeHtml(passLabel(r.set)) + "</span>";
      html += '<span class="board-chart">' + escapeHtml(chartText(r.set)) + "</span>";
      html += '<span class="' + deltaClass + '">' + escapeHtml(formatDelta(delta)) + "</span>";
      html += "</div></li>";
    }
    list.innerHTML = html;
  }

  function renderClubBoard() {
    var list = document.getElementById("club-list");
    var empty = document.getElementById("club-empty");
    var head = document.getElementById("club-head");
    if (!list) return;
    if (!clubVisible()) {
      list.innerHTML = "";
      if (empty) empty.hidden = true;
      if (head) head.hidden = true;
      return;
    }
    var people = clubPeople();
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
      html += '<span class="board-pass">' + escapeHtml(passLabel(r.set)) + "</span>";
      html += '<span class="board-chart">' + escapeHtml(chartText(r.set)) + "</span>";
      html += "</div></li>";
    }
    list.innerHTML = html;
  }

  function renderBeatAverage() {
    var list = document.getElementById("beat-list");
    var empty = document.getElementById("beat-empty");
    var head = document.getElementById("beat-head");
    if (!list) return;
    if (!clubVisible()) {
      list.innerHTML = "";
      if (empty) empty.hidden = true;
      if (head) head.hidden = true;
      return;
    }
    var people = clubPeople();
    var rows = [];
    var i;
    for (i = 0; i < people.length; i++) {
      var latest = latestSkierDate(people[i]);
      if (!latest) continue;
      var set = bestSetOnDate(people[i], latest);
      if (!set) continue;
      var delta = deltaVsDate(people[i], latest);
      rows.push({ person: people[i], set: set, date: latest, delta: delta });
    }
    rows.sort(function (a, b) {
      var ae = a.delta != null;
      var be = b.delta != null;
      if (ae && !be) return -1;
      if (!ae && be) return 1;
      if (ae && be && a.delta !== b.delta) return b.delta - a.delta;
      if (ae && be) return compareSetsDesc(a.set, b.set);
      var an = displayName(a.person);
      var bn = displayName(b.person);
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
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
    var rank = 0;
    for (i = 0; i < rows.length; i++) {
      var r = rows[i];
      var you = r.person.id === curId;
      var eligible = r.delta != null;
      if (eligible) rank += 1;
      var first = eligible && rank === 1;
      html += '<li class="board-row' + (you ? " is-you" : "") + (first ? " is-first" : "") + '">';
      html += '<div class="beat-cols">';
      html += '<span class="board-rank">' + (eligible ? String(rank) : "—") + "</span>";
      html += '<span class="board-name">' + escapeHtml(displayName(r.person)) + "</span>";
      html += '<span class="board-date">' + escapeHtml(prettyDateShort(r.date)) + "</span>";
      html += '<span class="board-chart">' + escapeHtml(chartText(r.set)) + "</span>";
      if (eligible) {
        html += '<span class="board-delta' + (r.delta > 0 ? " is-up" : "") + '">' +
          escapeHtml(formatDelta(r.delta)) + "</span>";
      } else {
        html += '<span class="board-delta board-need">Need 2 days</span>';
      }
      html += "</div></li>";
    }
    list.innerHTML = html;
  }

  function renderBest10() {
    var list = document.getElementById("best-list");
    var empty = document.getElementById("best-empty");
    var head = document.getElementById("best-head");
    if (!list) return;
    if (!clubVisible()) {
      list.innerHTML = "";
      if (empty) empty.hidden = true;
      if (head) head.hidden = true;
      return;
    }
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
      html += '<span class="board-pass">' + escapeHtml(passLabel(r)) + "</span>";
      html += '<span class="board-chart">' + escapeHtml(chartText(r)) + "</span>";
      html += "</div></li>";
    }
    list.innerHTML = html;
  }

  function renderBoards() {
    paintClubChrome();
    renderSession();
    renderClubBoard();
    renderBeatAverage();
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
      var onB = draftBuoys === b;
      html += '<button type="button" class="buoy-btn' + (onB ? " is-on" : "") +
        '" data-act="select-buoys" data-n="' + b + '" aria-pressed="' + (onB ? "true" : "false") + '">' +
        formatBuoys(b) + "</button>";
    }
    document.getElementById("buoy-chips").innerHTML = html;
    paintSubmitSet();

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
      html += '<span class="board-pass">' + escapeHtml(passLabel(s)) + "</span>";
      html += '<span class="board-chart">' + escapeHtml(chartText(s)) + "</span>";
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

  function addJunior(raw) {
    return false;
    if (!clubVisible()) return false;
    var name = String(raw || "").replace(/\s+/g, " ").trim();
    if (!name) return false;
    if (nameTaken(name)) {
      showToast("log", "That skier is already on the roster");
      return false;
    }
    var p = emptyPerson(newPersonId(), name);
    p.junior = true;
    p.seed = false;
    p.parentId = window.LAKE_USER_ID || currentAdultId();
    p.slalomSets = [];
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

  var personNameField = document.getElementById("person-name");
  if (personNameField) {
    personNameField.addEventListener("input", function (e) {
      var p = currentPerson();
      var val = e.target.value;
      var trimmed = String(val || "").replace(/\s+/g, " ").trim();
      if (trimmed && nameTaken(trimmed, p.id)) return;
      p.name = val;
      save(state);
      renderRoster();
      renderBoards();
    });

    personNameField.addEventListener("blur", function (e) {
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
  }

  var addJuniorForm = document.getElementById("add-junior-form");
  if (addJuniorForm) {
    addJuniorForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var field = document.getElementById("add-junior-name");
      var name = field ? field.value : "";
      if (addJunior(name) && field) field.value = "";
      if (field) field.focus();
    });
  }

  var personSelect = document.getElementById("person-select");
  if (personSelect) {
    personSelect.addEventListener("change", function (e) {
      switchPerson(e.target.value);
    });
  }

  function setSettingsOpen(open) {
    var panel = document.getElementById("settings-panel");
    var scrim = document.getElementById("settings-scrim");
    var gear = document.getElementById("settings-btn");
    if (panel) panel.hidden = !open;
    if (scrim) scrim.hidden = !open;
    if (gear) gear.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("settings-open", !!open);
  }

  var settingsBtn = document.getElementById("settings-btn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", function () {
      var panel = document.getElementById("settings-panel");
      setSettingsOpen(panel ? panel.hidden : true);
    });
  }
  var settingsClose = document.getElementById("settings-close");
  if (settingsClose) settingsClose.addEventListener("click", function () { setSettingsOpen(false); });
  var settingsScrim = document.getElementById("settings-scrim");
  if (settingsScrim) settingsScrim.addEventListener("click", function () { setSettingsOpen(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setSettingsOpen(false);
  });

  var settingsPanel = document.getElementById("settings-panel");
  if (settingsPanel) {
    settingsPanel.addEventListener("click", function (e) {
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
  }

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
        hostPushKneeboardNew(currentPerson(), entry, 0, trickNameOf(sport, id), modeOf(sport, id));
      } else {
        hostDropKneeboardEntry(entry);
        clearLand(entry);
        entry.remoteIds = [];
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
      hostUpdateKneeboard(currentPerson(), entryF, 0, trickNameOf(sport, id), modeOf(sport, id));
      return;
    }

    if (act === "log-date") {
      var entryL = ensureEntry(sport, id);
      var idx = parseInt(el.getAttribute("data-index"), 10);
      if (!el.value || isNaN(idx) || !entryL.dates[idx]) return;
      entryL.dates[idx] = el.value;
      afterProgress();
      hostUpdateKneeboard(currentPerson(), entryL, idx, trickNameOf(sport, id), modeOf(sport, id));
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

    if (el.classList && el.classList.contains("trick-photo-input") && el.files && el.files[0]) {
      var photoFile = el.files[0];
      var photoWrap = el.closest(".trick-photo-wrap");
      var photoBtn = photoWrap ? photoWrap.querySelector(".trick-photo-btn") : null;
      handleTrickPhotoFile(sport, id, photoFile, photoBtn);
      el.value = "";
      return;
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
    if (act === "select-buoys") {
      draftBuoys = parseBuoys(btn.getAttribute("data-n"));
      renderSlalom();
      return;
    }
    if (act === "submit-set") {
      logSet(draftBuoys);
      return;
    }
    if (act === "delete-set") {
      deleteSet(btn.getAttribute("data-id"));
      return;
    }
    var sport = btn.getAttribute("data-sport");
    var id = btn.getAttribute("data-id");
    if (!sport || !id) return;

    if (act === "photo") {
      if (!hostEnabled()) {
        showToast("log", PHOTO_JOIN_TOAST);
        return;
      }
      if (btn.classList.contains("is-filled")) {
        openPhotoLightbox(sport, id, btn);
      } else {
        var logIdC = btn.getAttribute("data-log-id") || hostedLogIdForTrick(sport, id);
        if (!isUuid(logIdC)) {
          var entryC = ensureEntry(sport, id);
          if (!Array.isArray(entryC.remoteIds)) entryC.remoteIds = [];
          if (!isUuid(entryC.remoteIds[0])) entryC.remoteIds[0] = newUuid();
          logIdC = entryC.remoteIds[0];
          btn.setAttribute("data-log-id", logIdC);
          var photoWrapFix = btn.closest(".trick-photo-wrap");
          var photoInputFix = photoWrapFix ? photoWrapFix.querySelector(".trick-photo-input") : null;
          if (photoInputFix) photoInputFix.setAttribute("data-log-id", logIdC);
          save(state);
          hostPushKneeboardNew(currentPerson(), entryC, 0, trickNameOf(sport, id), modeOf(sport, id));
        }
        var photoWrapC = btn.closest(".trick-photo-wrap");
        var photoInputC = photoWrapC ? photoWrapC.querySelector(".trick-photo-input") : null;
        if (photoInputC) photoInputC.click();
      }
      return;
    }

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
      if (entry.remoteIds) {
        var mi;
        for (mi = 0; mi < entry.remoteIds.length; mi++) {
          hostUpdateKneeboard(currentPerson(), entry, mi, trickNameOf(sport, id), entry.mode);
        }
      }
      renderSport(sport);
      return;
    }

    if (act === "log-again") {
      var entryA = ensureEntry(sport, id);
      var idxA;
      if (!isLanded(entryA)) {
        landNow(entryA);
        idxA = 0;
      } else {
        entryA.dates.push(todayISO());
        syncCount(entryA);
        idxA = entryA.dates.length - 1;
      }
      hostPushKneeboardNew(currentPerson(), entryA, idxA, trickNameOf(sport, id), modeOf(sport, id));
      afterProgress();
      renderSport(sport);
      return;
    }

    if (act === "drop-date") {
      var entryD = ensureEntry(sport, id);
      var dropIdx = parseInt(btn.getAttribute("data-index"), 10);
      if (isNaN(dropIdx) || dropIdx <= 0) return;
      var dropId = entryD.remoteIds && entryD.remoteIds[dropIdx];
      entryD.dates.splice(dropIdx, 1);
      if (entryD.remoteIds) entryD.remoteIds.splice(dropIdx, 1);
      syncCount(entryD);
      if (dropId) dropKneeboardIds([dropId]);
      afterProgress();
      renderSport(sport);
      return;
    }

    if (act === "remove") {
      var p = currentPerson();
      hostDropKneeboardEntry(getEntry(sport, id));
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
      var name = (field.value || "").replace(/\s+/g, " ").trim();
      if (!name) return;
      var existing = findTrickByName(name);
      if (existing) {
        var already = getEntry(sport, existing.id);
        if (!isLanded(already)) {
          var entryE = ensureEntry(sport, existing.id);
          landNow(entryE);
          hostPushKneeboardNew(currentPerson(), entryE, 0, existing.name, modeOf(sport, existing.id));
        }
        kbQuery = "";
        afterProgress();
        field.value = "";
        renderSport(sport);
        field.focus();
        return;
      }
      var band = workingBand();
      var mode = band >= 7 ? "hard" : "easy";
      var custom = {
        id: "custom-" + sport + "-" + Date.now(),
        name: name,
        custom: true,
        mode: mode,
        diff: band
      };
      currentPerson().sports[sport].customs.push(custom);
      var entry = ensureEntry(sport, custom.id);
      entry.mode = mode;
      landNow(entry);
      hostPushKneeboardNew(currentPerson(), entry, 0, name, mode);
      kbQuery = "";
      afterProgress();
      field.value = "";
      renderSport(sport);
      field.focus();
    });
  }

  var kbSearch = document.getElementById("add-kneeboard");
  if (kbSearch && !kbSearch.getAttribute("data-hive")) {
    kbSearch.setAttribute("data-hive", "1");
    kbSearch.addEventListener("input", function () {
      kbQuery = (kbSearch.value || "").replace(/\s+/g, " ").trim();
      renderSport("kneeboard");
    });
  }

  var photoLightboxCloseBtn = document.getElementById("photo-lightbox-close");
  if (photoLightboxCloseBtn) {
    photoLightboxCloseBtn.addEventListener("click", function () { closePhotoLightbox(); });
  }
  var photoLightboxScrim = document.getElementById("photo-lightbox-scrim");
  if (photoLightboxScrim) {
    photoLightboxScrim.addEventListener("click", function () { closePhotoLightbox(); });
  }
  var photoLightboxRemoveBtn = document.getElementById("photo-lightbox-remove");
  if (photoLightboxRemoveBtn) {
    photoLightboxRemoveBtn.addEventListener("click", function () {
      var confirmBlock = document.getElementById("photo-lightbox-confirm");
      var actions = document.querySelector(".photo-lightbox-actions");
      if (confirmBlock) confirmBlock.hidden = false;
      if (actions) actions.hidden = true;
    });
  }
  var photoLightboxConfirmCancelBtn = document.getElementById("photo-lightbox-confirm-cancel");
  if (photoLightboxConfirmCancelBtn) {
    photoLightboxConfirmCancelBtn.addEventListener("click", function () {
      resetPhotoLightboxConfirm();
    });
  }
  var photoLightboxConfirmRemoveBtn = document.getElementById("photo-lightbox-confirm-remove");
  if (photoLightboxConfirmRemoveBtn) {
    photoLightboxConfirmRemoveBtn.addEventListener("click", function () {
      var logId = photoLightboxState.logId;
      var btn = photoLightboxState.btn;
      if (!isUuid(logId) || !hostEnabled() || !window.LakeClub.removeKneeboardPhoto) {
        closePhotoLightbox();
        return;
      }
      if (!photoLightboxState.canEdit) {
        showToast("log", "Only the logger can remove this photo.");
        return;
      }
      window.LakeClub.removeKneeboardPhoto(window.LAKE_SB, logId).then(function (res) {
        if (res && res.ok === false) {
          showToast("log", res.error || "Couldn\u2019t remove that photo.");
          return;
        }
        clearPhotoMeta(logId);
        setPhotoButtonState(btn, false);
        closePhotoLightbox();
        showToast("log", "Photo removed");
        afterHostChange();
      }).catch(function () {
        showToast("log", "Couldn\u2019t remove that photo.");
      });
    });
  }
  var photoLightboxReplaceBtn = document.getElementById("photo-lightbox-replace");
  var photoLightboxFileInput = document.getElementById("photo-lightbox-file");
  if (photoLightboxReplaceBtn && photoLightboxFileInput) {
    photoLightboxReplaceBtn.addEventListener("click", function () {
      if (!photoLightboxState.canEdit) {
        showToast("log", "Only the logger can replace this photo.");
        return;
      }
      photoLightboxFileInput.click();
    });
    photoLightboxFileInput.addEventListener("change", function () {
      var file = photoLightboxFileInput.files && photoLightboxFileInput.files[0];
      photoLightboxFileInput.value = "";
      if (!file) return;
      var sport = photoLightboxState.sport || "kneeboard";
      var id = photoLightboxState.trickId;
      var btn = photoLightboxState.btn;
      var logId = photoLightboxState.logId;
      if (!isUuid(logId)) return;
      if (btn && logId) btn.setAttribute("data-log-id", logId);
      handleTrickPhotoFile(sport, id || "kb", file, btn, function () {
        openPhotoLightboxForLog(logId, btn, sport, id);
      });
    });
  }

  paintClubChrome();
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
