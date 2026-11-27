/* lake.world live water temperature widget (read-only, zero secrets).
 * Mounts into any [data-lake-temp-widget] element with a valid https:// or same-origin data-endpoint.
 */
(function () {
  "use strict";

  var UNIT_STORAGE_KEY = "lake_world_temp_unit";

  function isSafeEndpoint(raw) {
    if (typeof raw !== "string") return false;
    var trimmed = raw.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith("/")) return true;
    try {
      var u = new URL(trimmed);
      return u.protocol === "https:";
    } catch (_) {
      return false;
    }
  }

  function formatAge(ageMinutes) {
    if (typeof ageMinutes !== "number" || !Number.isFinite(ageMinutes) || ageMinutes < 0) {
      return "Updated recently";
    }
    if (ageMinutes < 1) return "Updated just now";
    if (ageMinutes === 1) return "Updated 1 min ago";
    if (ageMinutes < 60) return "Updated " + Math.round(ageMinutes) + " min ago";
    var hrs = Math.round(ageMinutes / 60);
    return hrs === 1 ? "Updated 1 hr ago" : "Updated " + hrs + " hrs ago";
  }

  function readPreferredUnit() {
    try {
      var saved = window.localStorage.getItem(UNIT_STORAGE_KEY);
      if (saved === "C" || saved === "F") return saved;
    } catch (_) {}
    return "F";
  }

  function savePreferredUnit(unit) {
    try {
      window.localStorage.setItem(UNIT_STORAGE_KEY, unit);
    } catch (_) {}
  }

  function renderWidget(el, data, label) {
    if (!data || data.ok !== true || typeof data.tempF !== "number" || typeof data.tempC !== "number") {
      el.hidden = true;
      return;
    }

    var unit = readPreferredUnit();
    el.hidden = false;
    el.textContent = "";

    var card = document.createElement("div");
    card.className = "lt-card";
    if (data.stale || data.online === false) {
      card.classList.add("lt-stale");
    }

    var top = document.createElement("div");
    top.className = "lt-top";

    var labelEl = document.createElement("span");
    labelEl.className = "lt-label";
    labelEl.textContent = label || "Water temp";

    var unitBtn = document.createElement("button");
    unitBtn.type = "button";
    unitBtn.className = "lt-unit-btn";
    unitBtn.setAttribute("aria-label", "Switch temperature unit");

    top.appendChild(labelEl);
    top.appendChild(unitBtn);

    var valueEl = document.createElement("div");
    valueEl.className = "lt-value";

    var metaEl = document.createElement("div");
    metaEl.className = "lt-meta";
    var statusText = formatAge(data.ageMinutes);
    if (data.online === false) {
      statusText += " · Sensor offline";
    } else if (data.stale) {
      statusText += " · Stale reading";
    }
    metaEl.textContent = statusText;

    function syncUnit() {
      var num = unit === "C" ? data.tempC : data.tempF;
      valueEl.textContent = num.toFixed(1) + "\u00b0" + unit;
      unitBtn.textContent = unit === "C" ? "Show \u00b0F" : "Show \u00b0C";
    }

    unitBtn.addEventListener("click", function () {
      unit = unit === "C" ? "F" : "C";
      savePreferredUnit(unit);
      syncUnit();
    });

    syncUnit();
    card.appendChild(top);
    card.appendChild(valueEl);
    card.appendChild(metaEl);
    el.appendChild(card);
  }

  function mountOne(el) {
    var endpoint = el.getAttribute("data-endpoint") || "";
    var label = el.getAttribute("data-label") || "Water temp";
    if (!isSafeEndpoint(endpoint)) {
      el.hidden = true;
      return;
    }

    fetch(endpoint, { method: "GET", headers: { Accept: "application/json" } })
      .then(function (res) {
        if (!res.ok) throw new Error("http_" + res.status);
        return res.json();
      })
      .then(function (data) {
        renderWidget(el, data, label);
      })
      .catch(function () {
        el.hidden = true;
      });
  }

  function init() {
    var nodes = document.querySelectorAll("[data-lake-temp-widget]");
    for (var i = 0; i < nodes.length; i++) {
      mountOne(nodes[i]);
    }
  }

  if (typeof window !== "undefined") {
    window.LakeTempWidget = {
      isSafeEndpoint: isSafeEndpoint,
      formatAge: formatAge,
      renderWidget: renderWidget,
      mountOne: mountOne,
      init: init
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }
})();
