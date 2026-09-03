(function (w) {
  "use strict";

  var PHOTO_BUCKET = "kneeboard-photos";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function recencyName(row) {
    var name = (row && row.display_name) || "Member";
    return row && row.is_junior && name.indexOf("(junior)") === -1 ? name + " (junior)" : name;
  }

  function prettyDate(value, includeTime) {
    var date = new Date(value);
    if (isNaN(date.getTime())) return String(value || "").slice(0, 10);
    var options = includeTime
      ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric" };
    return date.toLocaleString([], options);
  }

  function passLabel(row) {
    return String(Number(row.buoys)) + " · " + row.off + " off · " + row.mph + " mph";
  }

  function chartText(row) {
    var speeds = [28, 30, 32, 34, 36];
    var lines = [15, 22, 28, 32];
    var speed = speeds.indexOf(parseInt(row.mph, 10));
    var line = lines.indexOf(parseInt(row.off, 10));
    if (speed < 0) speed = 0;
    if (line < 0) line = 0;
    return String(speed * 24 + line * 6 + Number(row.buoys || 0));
  }

  function commentIcon() {
    return '<svg class="comment-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20.4 11.7c0 3.75-3.76 6.8-8.4 6.8-.86 0-1.7-.1-2.48-.3L4.9 19.9l1.42-3.55C4.85 15.1 3.6 13.5 3.6 11.7c0-3.75 3.76-6.8 8.4-6.8s8.4 3.05 8.4 6.8z"/></svg>';
  }

  function highFiveIcon() {
    return '<svg class="highfive-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8.1 10.4V6.2a1.35 1.35 0 0 1 2.7 0v4.2h.15V4.7a1.35 1.35 0 1 1 2.7 0v5.6h.15V5.5a1.35 1.35 0 1 1 2.7 0v6h.15V7.6a1.35 1.35 0 1 1 2.7 0V14c0 3.45-2.35 6.15-6.05 6.15-3.25 0-5.8-2.25-5.8-5.55v-1.15H7.2A1.85 1.85 0 0 1 5.35 12V9.3a1.35 1.35 0 0 1 2.7 0v1.1h.05z"/></svg>';
  }

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

  function renderRecencyPhotoButton(logId) {
    var logAttr = escapeHtml(logId || "");
    return '<button type="button" class="recency-photo-btn is-filled" data-act="recency-photo" data-kind="kneeboard" data-id="' +
      logAttr + '" aria-label="View trick photo">' +
      '<span class="trick-photo-icon">' + photoIconSvg(true) + "</span>" +
      "</button>";
  }

  function key(kind, id) { return String(kind) + ":" + String(id); }

  function toast(msg) {
    var el = document.getElementById("app-toast");
    if (!el) return;
    el.textContent = msg || "";
    el.classList.add("is-on");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove("is-on"); }, 2200);
  }

  function ClubLogs(options) {
    this.sb = options.sb;
    this.clubId = options.clubId;
    this.showError = options.showError || function () {};
    this.rows = [];
    this.open = {};
    this._photoState = { logId: "", canEdit: false, lastFocus: null };
    this._lightboxBound = false;
  }

  ClubLogs.prototype.setClub = function (sb, clubId) {
    this.sb = sb;
    if (this.clubId !== clubId) this.open = {};
    this.clubId = clubId;
  };

  ClubLogs.prototype.focusComposer = function (kind, id) {
    var form = document.querySelector('.comment-form[data-kind="' + kind + '"][data-id="' + id + '"]');
    var input = form && form.querySelector("input");
    if (input && input.focus) input.focus();
  };

  ClubLogs.prototype.bindLightbox = function () {
    var self = this;
    if (this._lightboxBound) return;
    this._lightboxBound = true;
    var closeBtn = document.getElementById("photo-lightbox-close");
    var scrim = document.getElementById("photo-lightbox-scrim");
    var removeBtn = document.getElementById("photo-lightbox-remove");
    var confirmCancel = document.getElementById("photo-lightbox-confirm-cancel");
    var confirmRemove = document.getElementById("photo-lightbox-confirm-remove");
    if (closeBtn) closeBtn.addEventListener("click", function () { self.closePhoto(); });
    if (scrim) scrim.addEventListener("click", function () { self.closePhoto(); });
    if (removeBtn) {
      removeBtn.addEventListener("click", function () {
        var confirmBlock = document.getElementById("photo-lightbox-confirm");
        var actions = document.querySelector(".photo-lightbox-actions");
        if (confirmBlock) confirmBlock.hidden = false;
        if (actions) actions.hidden = true;
      });
    }
    if (confirmCancel) {
      confirmCancel.addEventListener("click", function () {
        var confirmBlock = document.getElementById("photo-lightbox-confirm");
        var actions = document.querySelector(".photo-lightbox-actions");
        if (confirmBlock) confirmBlock.hidden = true;
        if (actions && self._photoState.canEdit) actions.hidden = false;
      });
    }
    if (confirmRemove) {
      confirmRemove.addEventListener("click", function () {
        var logId = self._photoState.logId;
        if (!logId || !self.sb || !w.LakeClub || !w.LakeClub.removeKneeboardPhoto) {
          self.closePhoto();
          return;
        }
        if (!self._photoState.canEdit) {
          toast("Only the logger can remove this photo.");
          return;
        }
        w.LakeClub.removeKneeboardPhoto(self.sb, logId).then(function (res) {
          if (res && res.ok === false) {
            self.showError(res.error || "Couldn’t remove that photo.");
            return;
          }
          self.closePhoto();
          toast("Photo removed");
          self.load();
        }).catch(function () {
          self.showError("Couldn’t remove that photo.");
        });
      });
    }
  };

  ClubLogs.prototype.closePhoto = function () {
    var dlg = document.getElementById("photo-lightbox");
    var scrim = document.getElementById("photo-lightbox-scrim");
    var img = document.getElementById("photo-lightbox-img");
    var confirmBlock = document.getElementById("photo-lightbox-confirm");
    var actions = document.querySelector(".photo-lightbox-actions");
    if (dlg) dlg.hidden = true;
    if (scrim) scrim.hidden = true;
    if (img) {
      img.removeAttribute("src");
      img.alt = "";
    }
    if (confirmBlock) confirmBlock.hidden = true;
    if (actions) actions.hidden = true;
    document.body.classList.remove("photo-lightbox-open");
    document.removeEventListener("keydown", this._onPhotoKey, true);
    var restore = this._photoState.lastFocus;
    this._photoState = { logId: "", canEdit: false, lastFocus: null };
    if (restore && typeof restore.focus === "function") {
      try { restore.focus(); } catch (err) {}
    }
  };

  ClubLogs.prototype.openPhoto = function (logId, triggerBtn) {
    var self = this;
    this.bindLightbox();
    if (!this.sb || !w.LakeClub || !w.LakeClub.viewKneeboardPhoto) {
      this.showError("Couldn’t open that photo.");
      return;
    }
    w.LakeClub.viewKneeboardPhoto(this.sb, logId).then(function (meta) {
      if (!meta || meta.ok === false) {
        self.showError((meta && meta.error) || "No photo saved yet.");
        return null;
      }
      return self.sb.storage.from(PHOTO_BUCKET).createSignedUrl(meta.object_path, 120).then(function (res) {
        if (res.error || !res.data || !res.data.signedUrl) throw res.error || new Error("signed url failed");
        return { meta: meta, url: res.data.signedUrl };
      });
    }).then(function (pack) {
      if (!pack) return;
      var dlg = document.getElementById("photo-lightbox");
      var scrim = document.getElementById("photo-lightbox-scrim");
      var img = document.getElementById("photo-lightbox-img");
      var actions = document.querySelector(".photo-lightbox-actions");
      var replaceBtn = document.getElementById("photo-lightbox-replace");
      var confirmBlock = document.getElementById("photo-lightbox-confirm");
      if (!dlg || !scrim || !img) {
        self.showError("Photo viewer is not available on this page.");
        return;
      }
      self._photoState = {
        logId: logId,
        canEdit: pack.meta.can_edit === true,
        lastFocus: triggerBtn || document.activeElement
      };
      img.src = pack.url;
      img.alt = (pack.meta.trick_name || "Trick") + " photo";
      if (confirmBlock) confirmBlock.hidden = true;
      if (actions) actions.hidden = !self._photoState.canEdit;
      if (replaceBtn) replaceBtn.hidden = true;
      dlg.hidden = false;
      scrim.hidden = false;
      document.body.classList.add("photo-lightbox-open");
      self._onPhotoKey = function (e) {
        if (e.key === "Escape") {
          e.preventDefault();
          self.closePhoto();
        }
      };
      document.addEventListener("keydown", self._onPhotoKey, true);
      var closeBtn = document.getElementById("photo-lightbox-close");
      if (closeBtn && closeBtn.focus) closeBtn.focus();
    }).catch(function () {
      self.showError("Couldn’t open that photo.");
    });
  };

  ClubLogs.prototype.rowHtml = function (row) {
    var kind = row.kind === "kneeboard" ? "kneeboard" : "slalom";
    var comments = Array.isArray(row.comments) ? row.comments : [];
    var isOpen = !!this.open[key(kind, row.id)];
    var html = '<li class="board-row recency-row"><div class="recency-top">';
    html += '<span class="board-name">' + escapeHtml(recencyName(row)) + '</span>';
    html += '<span class="board-date">' + escapeHtml(prettyDate(row.logged_at, kind === "slalom")) + '</span></div>';
    html += '<div class="recency-detail"><div class="recency-facts">';
    if (kind === "kneeboard") html += '<span class="recency-trick">' + escapeHtml(row.trick_name || "") + '</span>';
    else html += '<span class="board-pass">' + escapeHtml(passLabel(row)) + '</span><span class="board-chart">Chart ' + escapeHtml(chartText(row)) + '</span>';
    html += '</div><div class="recency-acts">';
    html += '<button type="button" class="comment-btn' + (isOpen ? ' is-on' : '') + '" data-act="toggle-comments" data-kind="' + kind + '" data-id="' + escapeHtml(row.id) + '" aria-expanded="' + isOpen + '" aria-label="Comments">' + commentIcon();
    if (comments.length) html += '<span class="comment-count">' + comments.length + '</span>';
    html += '</button><button type="button" class="highfive-btn' + (row.i_high_five ? ' is-on' : '') + '" data-act="high-five" data-kind="' + kind + '" data-id="' + escapeHtml(row.id) + '" aria-pressed="' + !!row.i_high_five + '" aria-label="High five">' + highFiveIcon();
    if (Number(row.high_fives) > 0) html += '<span class="highfive-count">' + Number(row.high_fives) + '</span>';
    html += '</button>';
    if (kind === "kneeboard" && (row.has_photo || row.photo_id || row.photo_path)) {
      html += renderRecencyPhotoButton(row.id);
    }
    html += '</div></div>';
    if (isOpen) {
      html += '<div class="recency-social">';
      if (comments.length) {
        html += '<ul class="comment-list">';
        comments.forEach(function (comment) {
          html += '<li class="comment-item"><span class="comment-author">' + escapeHtml(comment.display_name || "Member") + '</span><span class="comment-body">' + escapeHtml(comment.body || "") + '</span>';
          if (comment.mine) html += '<button type="button" class="comment-delete" data-act="delete-comment" data-id="' + escapeHtml(comment.id) + '">Delete</button>';
          html += '</li>';
        });
        html += '</ul>';
      }
      html += '<form class="comment-form" data-kind="' + kind + '" data-id="' + escapeHtml(row.id) + '"><input type="text" maxlength="280" placeholder="Add a comment…" aria-label="Add a comment" required><button type="submit">Post</button></form></div>';
    }
    return html + '</li>';
  };

  ClubLogs.prototype.paint = function () {
    var self = this;
    ["slalom", "kneeboard"].forEach(function (kind) {
      var list = document.getElementById(kind + "-logs-list");
      var empty = document.getElementById(kind + "-logs-empty");
      var rows = self.rows.filter(function (row) { return row.kind === kind; });
      if (list) list.innerHTML = rows.map(function (row) { return self.rowHtml(row); }).join("");
      if (empty) empty.hidden = rows.length > 0;
    });
  };

  ClubLogs.prototype.load = function () {
    var self = this;
    if (!this.sb || !this.clubId) { this.rows = []; this.paint(); return Promise.resolve(); }
    return w.LakeClub.recency(this.sb, this.clubId).then(function (data) {
      if (!data || data.ok === false) {
        self.rows = [];
        self.showError((data && data.error) || "Could not load club logs.");
      } else {
        self.rows = (data.rows || []).slice().sort(function (a, b) { return new Date(b.logged_at) - new Date(a.logged_at); });
      }
      self.paint();
    }).catch(function () {
      self.rows = [];
      self.paint();
      self.showError("Could not load club logs.");
    });
  };

  ClubLogs.prototype.handleClick = function (button) {
    var self = this;
    var act = button.getAttribute("data-act");
    var kind = button.getAttribute("data-kind");
    var id = button.getAttribute("data-id");
    if (act === "toggle-comments") {
      var rowKey = key(kind, id);
      var willOpen = !this.open[rowKey];
      if (willOpen) this.open[rowKey] = true; else delete this.open[rowKey];
      this.paint();
      if (willOpen) this.focusComposer(kind, id);
      return true;
    }
    if (act === "high-five") {
      w.LakeClub.toggleHighFive(this.sb, kind, id, this.clubId).then(function (result) {
        if (result && result.ok === false) self.showError(result.error); else self.load();
      });
      return true;
    }
    if (act === "recency-photo") {
      this.openPhoto(id, button);
      return true;
    }
    if (act === "delete-comment") {
      w.LakeClub.deleteComment(this.sb, id, this.clubId).then(function (result) {
        if (result && result.ok === false) self.showError(result.error); else self.load();
      });
      return true;
    }
    return false;
  };

  ClubLogs.prototype.handleSubmit = function (form) {
    var self = this;
    var input = form.querySelector("input");
    return w.LakeClub.addComment(this.sb, form.getAttribute("data-kind"), form.getAttribute("data-id"), input ? input.value : "", this.clubId).then(function (result) {
      if (result && result.ok === false) self.showError(result.error);
      else { if (input) input.value = ""; self.load(); }
    });
  };

  w.LakeClubLogs = ClubLogs;
})(window);
