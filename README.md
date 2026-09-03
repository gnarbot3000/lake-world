# lake.world

Brand is **lake.world** (not “Lake World”). Email/password on the splash (lake.world Supabase project `zejficslgaqryxrndfqi`, not TurnKay). Preview still works as a guest demo.

- `index.html` — public splash (hibala-style drifting watersports wall + Sign In + Preview).
- `preview/` — slalom/kneeboard log. Guest is this-device localStorage; a signed-in **approved** member sees the club they joined (switcher if they belong to more than one).
- `invite.html` — one-time named invite landing (`?token=`).
- `preview/admin.html` — admins approve/deny join requests and add/remove admins.
- `supabase/migrations/` — SQL for Darin to paste into the **lake.world** SQL editor. Do not run it against vinyl-archive.

Membership is email join + pick a club + admin approve. Clubs: Ski Paradise Cleveland, Adams Lake, Ski Pond. joel.hageman@gmail.com is the temporary admin (and approved member Joel Hageman) on all three. Invite copy-links are leftover (old tokens still work on `invite.html`) and are not the join path. The hosted board does not seed the old 30-name list. Roster, admins, club recency, High fives, and comments live in lake.world Supabase. Guest Preview stays personal-only on this device.

Domain sits at Squarespace. Registrar stays Squarespace. Separate from hibala.com.

Open `index.html`. Preview is `preview/index.html`.
