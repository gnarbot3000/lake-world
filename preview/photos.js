(function (w) {
  "use strict";

  /*
   * LakePhotos — small IndexedDB helper for private, device-local trick
   * photos on the Kneeboard personal logbook. Loaded before app.js.
   *
   * Design notes:
   * - One small object store, keyed by a composite string:
   *     <namespace>::<personId>::<sport>:<trickId>
   *   where namespace is "guest" (not signed in) or "u-<LAKE_USER_ID>"
   *   (signed in). This keeps guests, different signed-in club members,
   *   and their juniors from ever reading each other's photos even
   *   though everyone on one device shares a single IndexedDB database.
   * - Only ever stores { blob, type, width, height, savedAt }. No
   *   base64 strings, and nothing here ever touches localStorage.
   * - No network calls, no Supabase — entirely local to the browser.
   * - This file only knows how to open/get/put/delete. Validation,
   *   image decoding/downscaling/compression, and all UI (icon states,
   *   the lightbox) live in app.js so this stays a clean, dumb store.
   */

  var DB_NAME = "lake-world-kneeboard-photos-v1";
  var DB_VERSION = 1;
  var STORE = "photos";

  var dbPromise = null;

  function supported() {
    try {
      return !!w.indexedDB;
    } catch (err) {
      return false;
    }
  }

  function openDb() {
    if (!supported()) return Promise.resolve(null);
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve) {
      var req;
      try {
        req = w.indexedDB.open(DB_NAME, DB_VERSION);
      } catch (err) {
        resolve(null);
        return;
      }
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = function (e) {
        var db = e.target.result;
        try {
          db.onversionchange = function () {
            try { db.close(); } catch (err) {}
          };
        } catch (err) {}
        resolve(db);
      };
      req.onerror = function () {
        resolve(null);
      };
      req.onblocked = function () {};
    });
    return dbPromise;
  }

  /* "" / null / undefined LAKE_USER_ID => guest namespace, shared by
     whoever is using this device signed out (matches the rest of the
     app's "this device only" guest model). Any signed-in user id gets
     its own namespace so different accounts on the same device/browser
     never see each other's photos. */
  function namespaceFor(userId) {
    var uid = userId === null || userId === undefined ? "" : String(userId).trim();
    return uid ? ("u-" + uid) : "guest";
  }

  function keyFor(namespace, personId, trickId) {
    var ns = namespace || "guest";
    var pid = personId || "p1";
    var tid = trickId || "";
    return ns + "::" + pid + "::" + tid;
  }

  function put(key, record) {
    return openDb().then(function (db) {
      if (!db) return false;
      return new Promise(function (resolve, reject) {
        var tx;
        try {
          tx = db.transaction(STORE, "readwrite");
        } catch (err) {
          reject(err);
          return;
        }
        tx.objectStore(STORE).put(record, key);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error || new Error("Could not save photo.")); };
        tx.onabort = function () { reject(tx.error || new Error("Could not save photo.")); };
      });
    });
  }

  function get(key) {
    return openDb().then(function (db) {
      if (!db) return null;
      return new Promise(function (resolve, reject) {
        var tx;
        try {
          tx = db.transaction(STORE, "readonly");
        } catch (err) {
          reject(err);
          return;
        }
        var req = tx.objectStore(STORE).get(key);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error || new Error("Could not read photo.")); };
      });
    });
  }

  function remove(key) {
    return openDb().then(function (db) {
      if (!db) return false;
      return new Promise(function (resolve, reject) {
        var tx;
        try {
          tx = db.transaction(STORE, "readwrite");
        } catch (err) {
          reject(err);
          return;
        }
        tx.objectStore(STORE).delete(key);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error || new Error("Could not remove photo.")); };
        tx.onabort = function () { reject(tx.error || new Error("Could not remove photo.")); };
      });
    });
  }

  function hasPhoto(key) {
    return get(key).then(function (rec) {
      return !!(rec && rec.blob);
    }).catch(function () {
      return false;
    });
  }

  w.LakePhotos = {
    DB_NAME: DB_NAME,
    STORE: STORE,
    supported: supported,
    namespaceFor: namespaceFor,
    keyFor: keyFor,
    put: put,
    get: get,
    remove: remove,
    hasPhoto: hasPhoto
  };
})(window);
