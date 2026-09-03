(function (w) {
  "use strict";

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

  function key(kind, id) { return String(kind) + ":" + String(id); }

  function ClubLogs(options) {
    this.sb = options.sb;
    this.clubId = options.clubId;
    this.showError = options.showError || function () {};
    this.rows = [];
    this.open = {};
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
    html += '</button></div></div>';
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
