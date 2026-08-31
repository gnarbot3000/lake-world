# lake.world

Brand is **lake.world** (not “Lake World”). Email/password on the splash (lake.world Supabase project `zejficslgaqryxrndfqi`, not TurnKay). Preview still works as a guest demo.

- `index.html` — public splash (hibala-style drifting watersports wall + Sign In + Preview).
- `preview/` — slalom/kneeboard log. Guest is this-device localStorage; a signed-in **approved** member sees Ski Paradise Cleveland.
- `invite.html` — one-time named invite landing (`?token=`).
- `preview/admin.html` — members create invites; admins approve/deny and add/remove admins.
- `supabase/migrations/` — SQL for Darin to paste into the **lake.world** SQL editor. Do not run it against vinyl-archive.

Club is invite-only. The hosted board does not seed the old 30-name list. Sets/tricks stay on this device in this PR; roster/invites/admins are Supabase.

Domain sits at Squarespace. Registrar stays Squarespace. Separate from hibala.com.

Open `index.html`. Preview is `preview/index.html`.
