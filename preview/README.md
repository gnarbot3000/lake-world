# lake.world

Product brand: **lake.world** (not “Lake World”). Category: watersports. Local-first logbook for **slalom skiing** (main, best run of a set) and **kneeboarding** (secondary tricks). No accounts, no server, no judges. Self-report only.

Club is hardcoded: **North Ridgeville Ski Lake**. This browser is the club logbook for now — a local roster of skiers, no logins, no passwords, no other clubs. Real accounts are not here yet; everything stays on this device.

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

## Club roster

Skier chips on the Slalom tab are who is logging. Tap a name to switch. **Add skier** takes a name (orange bar); blank names and duplicate names (case-insensitive, trimmed) are refused. The header name field edits the *current* skier. Logging a set with no name toasts **Add a name to hit the board** and focuses that field — you cannot hit the board unnamed.

On first load, ten **made-up demo skiers** (fake North Ridgeville-ish names) are added once and tagged `seed: true` so a reload does not duplicate them. The current skier and their sets/kneeboard are left alone. Seeded names: Mike Raines, Sarah Polk, Dave Keene, Amy Voss, Chris Hallow, Jen Marchetti, Ryan Stoltz, Lisa Nguyen, Tom Bridger, Nate Crowley.

## Latest session vs club board

Two slalom boards, different windows:

- **Latest session** — the most recent date that appears on anyone’s `slalomSets` (not necessarily today). Heading like `Latest session · Aug 31`. One row per skier who logged that date, showing **their best run that day** (same tie-break). Columns: Skier · Line · Speed · **Buoys**. Current skier’s row is lime. Empty: `No session yet.` Rows sort hardest pass first.
- **Club board** — North Ridgeville Ski Lake, all-time. One row per skier who has at least one set, ranked by **career best** (more buoys, then shorter line / higher off, then faster mph). Columns: Rank · Skier · **Date** · Line · Speed · **Buoys**. The date is the day of that career-best run. Rank 1 is emphasized; current skier is highlighted. Empty: `Log a set to open the board.`
- **Best 10** — top 10 individual sets across the whole club (not one-row-per-skier; the same skier can appear more than once). Same sort as career best. Columns: Rank · Skier · Date · Line · Speed · Buoys. Current skier’s rows are lime. Empty: `No performances yet.`

Personal set history stays on this tab under the boards so the current skier’s own sets (and delete) are still right there — no extra hunt.

Slalom tab order: roster → line / speed / best-run chips + personal best → latest session → club board → best 10 → this skier’s sets.

## Slalom — best of the set

A set is 4–6 passes through the course. Log only the **best run** of that set.

Pick **line length** and **boat speed**, then tap the buoy count (**1 through 6 in halves**). That logs the set immediately: line, speed, buoys, today’s date. A tiny toast confirms it. **Buoys** is the official balls scored (1–6 in halves). History sits under the boards (newest first). Delete a set if you tapped wrong.

There is no working-range window, no bump-up after a 6, and **no ZBS**.

**Units** (`mph` | `kph`) live in the sticky header and are **club-wide**, not per skier. Default is **mph** (Ohio club). Internally every set is stored canonical `{ off, mph }`. Labels follow IWWF pairing:

| Off (stored) | Imperial | Metric |
| --- | --- | --- |
| 15 | 15 off | 18.25 m |
| 22 | 22 off | 16 m |
| 28 | 28 off | 14.25 m |
| 32 | 32 off | 13 m |

Speeds: **28 / 30 / 32 / 34 / 36 mph** ↔ **46 / 49 / 52 / 55 / 58 kph**. Tapping 18.25 m stores `off: 15`. Tapping 49 kph stores `mph: 30`.

No **Long line** option (starts at 15 off / 18.25 m). Default selected line/speed if unset: **15 off @ 28 mph**.

Who-bar **Slalom** shows the buoy count of the *current skier’s* best logged run, plus that setup in short form (example: `Slalom · 4.5` with `15 off · 32 mph`). If two runs share the same buoy count, the harder setup wins: shorter line, then faster speed. No sets yet: `Slalom · —`.

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

- Club roster lives in this browser’s `localStorage` (`nrs-ski-lake-tricks-v2`): `people[]` (`id`, `name`, `selectedPass`, `slalomSets`, `sports`, `score`, `trophies`, `hasMedia`, optional `seed` for demo skiers), `currentPersonId`, club-wide `units` (`mph` | `kph`), and `club`. Older `ticks` keys are ignored. This device only until real accounts exist.
- Photos and videos live in IndexedDB (`nrs-ski-lake-tricks-v2`), keyed per skier. They never leave this browser.
- Clearing site data for the file will wipe the roster, logbook, score, trophies, slalom sets, and media.

A flat v2 save (root `personName` / `slalomSets` / `selectedPass` / `sports` / `score` / `trophies` / `hasMedia`) migrates into one person (`p1`) and sets `currentPersonId` to that person. If `people` already exists, it is used as-is. Older `slalomPasses` (best 0–6 per pass key) still migrate into `slalomSets`. Old ZBS totals are ignored. `workingPass` becomes `selectedPass` if present.

## Catalog grain (not official rulebooks)

- **Kneeboard** — short AKA-style list of surface/wake spins, rolls, and handle tricks. Representative club wording, not a copied AKA/IWWF table.
- **Slalom** — best-of-set buoys on US AWSA-style feet-off + boat speed, with IWWF metric labels. Not a tournament matrix.

No wakeboard, kite, or wing. No other clubs.
