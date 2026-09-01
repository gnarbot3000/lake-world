# lake.world

Product brand: **lake.world** (not “Lake World”). Category: watersports. Local-first logbook for **slalom skiing** (main, best run of a set) and **kneeboarding** (secondary tricks). Self-report only. Splash Sign In is optional; Preview still works as a guest.

Club is hardcoded: **Ski Paradise Cleveland** (first / only club). No public create-a-club. Membership is **invite + admin approval** in lake.world Supabase. Guest Preview is personal-only. A signed-in **approved** member namespaces the local save and unlocks the club roster. Pending users see a waiting screen, not the roster.

Look: light outdoor dock log for noon on the water — UDisc/Hevy-inspired, high-contrast. Not a dark night-lake theme.

## Open on a Mac

1. In Finder, open this folder (`ski-lake-tricks`).
2. Double-click `index.html`.
3. It opens in your default browser. That is the whole install.

You can also drag `index.html` onto a Safari, Chrome, or Firefox window. A local web server is not required; `file://` works. There are no ES modules and no `fetch()` of local files.

Same idea on Windows or Linux: double-click `index.html`.

## Slalom is first

The Mini opens on **Slalom**. Kneeboard is the second tab. Switching skiers switches whose slalom log *and* whose kneeboard you see.

## Kneeboard

- **Tricks**, not ticks. Check a trick when you land it.
- Kneeboard is secondary (second tab).
- **Easy / unlock** — one-and-done. First success date only. No repeat diary. Seeded easy: surface 360 right / left / front-to-front, surface 180, surface wrap, ollie, tumble turn.
- **Hard / logbook** — completion count plus a list of dates. Seeded hard: heli (wake 360, handle pass), wake 360, surface 540, surface 720, backroll, front flip, wake 540, handle flip.
- Flip any row between Easy and Hard.
- First land (or first write-in add) stamps **today**. Edit the date if you actually landed it last Saturday.
- Add your own trick (example: *standing up on the kneeboard*). Write-ins default to easy unlock unless you mark Hard. They stamp today as first landed; uncheck or edit the date if needed.
- Optional **still photo or short video** on a landed trick. Pick a file, preview it, remove it. Media is stored in this browser’s IndexedDB only — not localStorage, not the cloud. Huge videos are still attempted; if the browser refuses, you get a preview warning.
- Progress counts (landed / total · percent).

## Club roster (invite-only)

Who is skiing is a **dropdown** in the header. Approved members log **their own** slalom/kneeboard sets and **their juniors’** sets only — not other adults. Names sort last, then first. Logging a set with no name toasts **Add a name to hit the board**. There is no email auto-match onto a hardcoded roster.

**Invites:** any approved member types a name (adult or junior), copies a one-time link, and sends it however they want. lake.world does not email invites. The invitee signs in / creates an account via `invite.html?token=` (also `preview/index.html?invite=` and `/?invite=`). They then sit **pending** until an admin approves. Pending signed-in users must not see the club roster.

**Juniors** also need an invite. A parent accepts while signed in. The junior stays pending until admin approval and is tied to that parent. After approval they show in that parent’s dropdown as `Owen Hageman (junior)`.

**First admin:** when `joel.hageman@gmail.com` signs in and the club has no admins yet, that account becomes the first admin and an approved member named Joel Hageman. He adds other admins in `preview/admin.html`. Do not hardcode extra admin emails. Non-admin members can create named invites; they cannot approve.

The hosted Mini does **not** seed the old 30-name list. `preview/club-roster.js` is unused and empty. `SEED_GEN` is `invite-only-1`: leftover `seed: true` people are stripped and not replaced.

**Privacy (hosted):** guest Preview on https is personal-only — themselves, no live club roster, boards hidden, note **Sign in to see Ski Paradise Cleveland.** `file://` Mini stays a personal logbook without the live club roster. Only invited **and** admin-approved people appear on roster / board / dropdown.

Roster / invites / admins live in lake.world Supabase. **Recent logs** (submitted slalom sets and kneeboard landings) are shared for approved members, with High fives and comments. Personal Mini history can stay on this device. Guest Preview is personal-only. Do not seed fake club performances.

## Recent logs vs local boards

- **Recent logs** — hosted, approved members only. Newest first, mixing submitted slalom sets and kneeboard landings. Slalom rows show name, date/time, pass (buoys · line · speed), and **Chart**. Kneeboard rows show name, date, trick, easy unlock / hard log. Members can **High five** (one per member per log, toggle off) and comment. Comments show the author’s display name; you can delete your own. No photos/video on recency. Guests and pending users do not see this board.
- **Latest session** / **Club board** / **Best 10** — this-device personal boards for you and your juniors. Ranking follows the **slalom chart**, not raw buoy count: faster boat at the same line is harder (4 @ 30 mph beats 6 @ 28 mph); after 36 mph, more off is harder; then buoys. The **Chart** number is that conversion, shown on the slalom screen and on the boards. Empty copy unchanged.

Personal set history stays on this tab under the boards so the current skier’s own sets (and delete) are still right there.

Slalom tab order: invite tools (approved members) → line / speed / best-run chips + Submit + personal best → recent logs → latest session → roster names → club board → best 10 → this skier’s sets. The member dropdown lives in the header.

## Slalom — best of the set

A set is 4–6 passes through the course. Log only the **best run** of that set.

Pick **line length**, **boat speed**, and buoy count (**1 through 6 in halves**). Nothing is posted until **Submit set**. Submit adds the set to this skier’s personal history and, for an approved member, to club recency. A tiny toast confirms it. **Buoys** is the official balls scored (1–6 in halves). History sits under the boards (newest first). Delete a set if you tapped wrong. Members submit only for themselves or their juniors. Guests stay personal-only.

**Chart rank** (not a tournament total): faster boat at the same line is a harder pass. Completing more of the ladder beats hanging at a slower speed. After max speed (36 mph), shorter line (more off) is harder, then buoys on that pass. The slalom screen and leaderboards show this Chart conversion. No Long line.

There is no working-range window, no bump-up after a 6, and **no ZBS**.

**Units** (`mph` | `kph`) live in the sticky header and are **club-wide**, not per skier. Default is **mph** (Cleveland club). Internally every set is stored canonical `{ off, mph }`. Labels follow IWWF pairing:

| Off (stored) | Imperial | Metric |
| --- | --- | --- |
| 15 | 15 off | 18.25 m |
| 22 | 22 off | 16 m |
| 28 | 28 off | 14.25 m |
| 32 | 32 off | 13 m |

Speeds: **28 / 30 / 32 / 34 / 36 mph** ↔ **46 / 49 / 52 / 55 / 58 kph**. Tapping 18.25 m stores `off: 15`. Tapping 49 kph stores `mph: 30`.

No **Long line** option (starts at 15 off / 18.25 m). Default selected line/speed if unset: **15 off @ 28 mph**.

Who-bar **Slalom** shows the buoy count of the *current skier’s* best logged run, plus setup and Chart (example: `Slalom · 4` with `15 off · 30 mph · chart 28`). Best follows the chart, not raw buoy count. No sets yet: `Slalom · —`.

## Score

Two numbers, both stored on this device so a later app can rank people. Self-report — no judges.

- **Score · n** (who-bar) — kneeboard logbook only.
  - Easy unlock (first land only): **1** point
  - Hard first land: **5** points
  - Each extra hard completion: **2** points
  - Unchecking a trick drops those points. Trophies already earned stay.
- **Slalom · n** — buoys of the displayed best run (a number like 4.5), not a tournament total.

## Personal trophies

Rare, auto-awarded shelf. No daily streaks. No badge for every easy surface 360. Kneeboard landings still award these; slalom set logs do not.

The shelf sits in the shared chrome (visible on both tabs). A short non-blocking toast appears when a trophy is newly earned.

Seeded trophies:

- **First trick** — kneeboard
- **First hard trick**
- **First heli** — the heli wake 360 (`kb-heli`)
- **Five lands of one hard trick** — count ≥ 5 on any single hard trick
- **First clip or photo** — first attached media
- **Lake opener** — first trick landed in a calendar year (Mini awards this once when you land anything)

Each trophy stores `id`, `title`, and earned date.

## What is stored

- Membership lives in Supabase (`members`, `club_admins`, `invites`). Local `localStorage` (`nrs-ski-lake-tricks-v2`) still holds this device’s people/logs: `people[]` (`id`, `name`, `selectedPass`, `slalomSets`, `sports`, `score`, `trophies`, `hasMedia`, optional `memberId`, optional `junior` / `parentId`), `currentPersonId`, club-wide `units` (`mph` | `kph`), `club`, and `seedGen` (currently `invite-only-1`). Guest key is `nrs-ski-lake-tricks-v2`; signed-in key appends `-<user id>`.
- Photos and videos live in IndexedDB (`nrs-ski-lake-tricks-v2`), keyed per skier. They never leave this browser.
- Clearing site data for the file will wipe the roster, logbook, score, trophies, slalom sets, and media.

A flat v2 save (root `personName` / `slalomSets` / `selectedPass` / `sports` / `score` / `trophies` / `hasMedia`) migrates into one person (`p1`) and sets `currentPersonId` to that person. If `people` already exists, it is used as-is. Older `slalomPasses` (best 0–6 per pass key) still migrate into `slalomSets`. Old ZBS totals are ignored. `workingPass` becomes `selectedPass` if present.

## Catalog grain (not official rulebooks)

- **Kneeboard** — short AKA-style list of surface/wake spins, rolls, and handle tricks. Representative club wording, not a copied AKA/IWWF table.
- **Slalom** — best-of-set buoys on US AWSA-style feet-off + boat speed, with IWWF metric labels. Not a tournament matrix.

No wakeboard, kite, or wing. No other clubs.
