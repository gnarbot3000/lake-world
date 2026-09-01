(function (w) {
  "use strict";

  var CLUB_NAME = "Ski Paradise Cleveland";
  var FIRST_ADMIN_EMAIL = "joel.hageman@gmail.com";

  var ERRORS = {
    not_signed_in: "Sign in first.",
    not_first: "The first admin is already set, or this account cannot claim it.",
    club_missing: "Club tables are not on the lake.world database yet. Ask Darin to run the SQL.",
    not_a_member: "Only approved members can create invites.",
    not_admin: "Only a club admin can do that.",
    bad_name: "Type a name (80 characters or fewer).",
    invite_invalid: "This invite link is not valid.",
    invite_consumed: "This invite was already used.",
    invite_is_junior: "A parent has to accept this junior invite while signed in.",
    invite_is_adult: "This invite is for an adult member.",
    parent_not_approved: "A parent who is already an approved member has to accept this junior invite while signed in.",
    already_member: "You are already on the club.",
    last_admin: "The club needs at least one admin.",
    not_approved_adult: "Only an approved adult member can be an admin.",
    not_found: "Could not find that member.",
    bad_status: "That status is not allowed.",
    not_your_log: "You can only log your sets and your juniors.",
    bad_set: "That slalom set is not valid.",
    bad_trick: "That kneeboard trick is not valid.",
    bad_comment: "Type a short comment (280 characters or fewer).",
    not_your_comment: "You can only delete your own comment."
  };

  function emptyState(status) {
    return {
      ok: true,
      clubId: "",
      clubName: CLUB_NAME,
      status: status || "guest",
      isAdmin: false,
      me: null,
      members: [],
      juniors: [],
      pending: [],
      admins: [],
      invites: [],
      error: ""
    };
  }

  function errorText(code) {
    if (!code) return "Something went wrong.";
    return ERRORS[code] || String(code);
  }

  function rpcError(err, data) {
    if (data && data.error) return errorText(data.error);
    var msg = err && (err.message || err.error_description || err.hint);
    if (msg && /could not find the function|schema cache|does not exist/i.test(msg)) {
      return ERRORS.club_missing;
    }
    return msg || "Something went wrong.";
  }

  function tokenFromUrl() {
    try {
      var q = new URLSearchParams(location.search || "");
      return String(q.get("invite") || q.get("token") || "").trim();
    } catch (err) {
      return "";
    }
  }

  function publicOrigin() {
    var host = "";
    try { host = location.hostname || ""; } catch (err) {}
    if (host === "lake.world" || host === "www.lake.world") return "https://lake.world";
    if (host.indexOf("github.io") !== -1) {
      return location.origin + "/lake-world";
    }
    if (location.protocol === "file:") {
      var path = String(location.pathname || "").replace(/\\/g, "/");
      var cut = path.lastIndexOf("/preview/");
      if (cut >= 0) return "file://" + path.slice(0, cut);
      cut = path.lastIndexOf("/");
      return "file://" + (cut >= 0 ? path.slice(0, cut) : path);
    }
    if (host === "localhost" || host === "127.0.0.1") {
      var base = location.origin + String(location.pathname || "");
      base = base.replace(/\/preview\/[^/]*$/, "").replace(/\/[^/]*$/, "");
      return base;
    }
    return location.origin;
  }

  function inviteUrl(token) {
    return publicOrigin() + "/invite.html?token=" + encodeURIComponent(token);
  }

  function stripInviteQuery() {
    try {
      if (!history || !history.replaceState) return;
      var url = new URL(location.href);
      if (!url.searchParams.has("invite") && !url.searchParams.has("token")) return;
      url.searchParams.delete("invite");
      url.searchParams.delete("token");
      var next = url.pathname + (url.search ? url.search : "") + url.hash;
      history.replaceState({}, "", next);
    } catch (err) {}
  }

  function normalize(raw) {
    var s = emptyState("none");
    if (!raw || typeof raw !== "object") return s;
    if (raw.ok === false) {
      s.ok = false;
      s.error = raw.error || "";
      s.status = "none";
      return s;
    }
    s.ok = true;
    s.clubId = raw.club_id || "";
    s.clubName = raw.club_name || CLUB_NAME;
    s.status = raw.status || "none";
    s.isAdmin = raw.is_admin === true;
    s.me = raw.me || null;
    s.members = Array.isArray(raw.members) ? raw.members : [];
    s.juniors = Array.isArray(raw.juniors) ? raw.juniors : [];
    s.pending = Array.isArray(raw.pending) ? raw.pending : [];
    s.admins = Array.isArray(raw.admins) ? raw.admins : [];
    s.invites = Array.isArray(raw.invites) ? raw.invites : [];
    return s;
  }

  function rpc(sb, name, args) {
    return sb.rpc(name, args || {}).then(function (result) {
      if (result.error) {
        return { ok: false, error: rpcError(result.error, result.data), raw: result };
      }
      var data = result.data;
      if (data && typeof data === "object" && data.ok === false) {
        return { ok: false, error: errorText(data.error), code: data.error, data: data };
      }
      return data;
    });
  }

  var api = {
    CLUB_NAME: CLUB_NAME,
    FIRST_ADMIN_EMAIL: FIRST_ADMIN_EMAIL,
    errorText: errorText,
    tokenFromUrl: tokenFromUrl,
    inviteUrl: inviteUrl,
    stripInviteQuery: stripInviteQuery,
    emptyState: emptyState,

    lookupInvite: function (sb, token) {
      return rpc(sb, "lookup_invite", { p_token: token });
    },

    createInvite: function (sb, name, isJunior) {
      return rpc(sb, "create_named_invite", {
        p_display_name: name,
        p_is_junior: !!isJunior
      });
    },

    consumeInvite: function (sb, token) {
      return rpc(sb, "consume_invite", { p_token: token });
    },

    setMemberStatus: function (sb, memberId, status) {
      return rpc(sb, "set_member_status", {
        p_member_id: memberId,
        p_status: status
      });
    },

    addAdmin: function (sb, userId) {
      return rpc(sb, "add_club_admin", { p_user_id: userId });
    },

    removeAdmin: function (sb, userId) {
      return rpc(sb, "remove_club_admin", { p_user_id: userId });
    },

    logSlalom: function (sb, row) {
      return rpc(sb, "log_slalom_set", {
        p_id: row.id,
        p_member_id: row.memberId,
        p_off: row.off,
        p_mph: row.mph,
        p_buoys: row.buoys
      });
    },

    deleteSlalom: function (sb, id) {
      return rpc(sb, "delete_slalom_log", { p_id: id });
    },

    logKneeboard: function (sb, row) {
      return rpc(sb, "log_kneeboard_trick", {
        p_id: row.id,
        p_member_id: row.memberId,
        p_logged_at: row.loggedAt || null,
        p_trick_name: row.trickName,
        p_mode: row.mode
      });
    },

    deleteKneeboard: function (sb, id) {
      return rpc(sb, "delete_kneeboard_log", { p_id: id });
    },

    recency: function (sb) {
      return rpc(sb, "club_recency", { p_limit: 50 });
    },

    toggleHighFive: function (sb, kind, logId) {
      return rpc(sb, "toggle_log_high_five", {
        p_kind: kind,
        p_log_id: logId
      });
    },

    addComment: function (sb, kind, logId, body) {
      return rpc(sb, "add_log_comment", {
        p_kind: kind,
        p_log_id: logId,
        p_body: body
      });
    },

    deleteComment: function (sb, id) {
      return rpc(sb, "delete_log_comment", { p_id: id });
    },

    refresh: function (sb) {
      return rpc(sb, "my_club_state", {}).then(function (data) {
        if (data && data.ok === false) return normalize(data);
        if (data && data.error && !data.club_id) {
          var s = emptyState("none");
          s.ok = false;
          s.error = data.error;
          return s;
        }
        return normalize(data);
      });
    },

    boot: function (sb, user) {
      var guest = emptyState("guest");
      if (!sb) return Promise.resolve(guest);
      if (!user) return Promise.resolve(guest);

      var token = tokenFromUrl();
      return rpc(sb, "claim_first_admin", {}).catch(function () {
        return { ok: false };
      }).then(function () {
        if (!token) return null;
        return api.consumeInvite(sb, token).then(function (res) {
          stripInviteQuery();
          return res;
        }).catch(function (err) {
          stripInviteQuery();
          return { ok: false, error: (err && err.message) || "" };
        });
      }).then(function (consumed) {
        return api.refresh(sb).then(function (state) {
          if (consumed && consumed.ok === false && consumed.error) {
            state.consumeError = consumed.error;
          }
          if (consumed && consumed.ok) state.justConsumed = consumed;
          return state;
        });
      }).catch(function (err) {
        var s = emptyState("none");
        s.ok = false;
        s.error = rpcError(err, null);
        return s;
      });
    }
  };

  w.LakeClub = api;
})(window);
