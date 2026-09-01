# lake.world Supabase (Ski Paradise Cleveland)

Project ref: **zejficslgaqryxrndfqi** (`https://zejficslgaqryxrndfqi.supabase.co`).

This is **not** TurnKay / vinyl-archive (`zvjhpsvnipugsghqlqvw`). Do not run this SQL there.

## Apply

1. Open the lake.world project SQL editor.
2. Paste and run `migrations/20260831_ski_paradise_club.sql` in one go (if not already applied).
3. Paste and run `migrations/20260831_ski_paradise_recency.sql` in one go (logs, recency, High fives, comments).
4. Confirm Auth does **not** require email verification (splash is email/password only).

The static GitHub Pages site uses the **anon** key in `js/config.js`. There is no service_role in client JS. Writes go through `SECURITY DEFINER` RPCs. Recency RPCs: `log_slalom_set`, `delete_slalom_log`, `log_kneeboard_trick`, `delete_kneeboard_log`, `club_recency`, `toggle_log_high_five`, `add_log_comment`, `delete_log_comment`.

First admin: when `joel.hageman@gmail.com` signs in and `club_admins` is empty, `claim_first_admin()` makes that user the first admin and an approved member named Joel Hageman. He adds other admins in `preview/admin.html`.
