# lake.world Supabase (Ski Paradise Cleveland)

Project ref: **zejficslgaqryxrndfqi** (`https://zejficslgaqryxrndfqi.supabase.co`).

This is **not** TurnKay / vinyl-archive (`zvjhpsvnipugsghqlqvw`). Do not run this SQL there.

## Apply

1. Open the **lake.world** project SQL editor (`zejficslgaqryxrndfqi` only — never TurnKay `zvjhpsvnipugsghqlqvw`).
2. Paste and run `migrations/20260831_ski_paradise_club.sql` in one go (if not already applied).
3. Paste and run `migrations/20260831_ski_paradise_recency.sql` in one go (logs, recency, High fives, comments).
4. After this membership change merges, paste and run `migrations/20260902_club_email_join.sql` in one go on **zejficslgaqryxrndfqi only** (email join RPCs, Adams Lake + Ski Pond, Joel temp admin on all three, `my_club_state(p_club_id)`). If `joel.hageman@gmail.com` has no auth user yet, clubs still insert; that email's next login runs `ensure_temp_admin()` for those three named clubs only.
5. After Kneeboard club photos merge, paste and run `migrations/20260903_kneeboard_club_photos.sql` in one go on **zejficslgaqryxrndfqi only** (private `kneeboard-photos` bucket, `kneeboard_log_photos`, prepare/register/view/remove RPCs, `club_recency` photo presence). NEVER TurnKay `zvjhpsvnipugsghqlqvw`.
6. Confirm Auth does **not** require email verification (splash is email/password only).

The static GitHub Pages site uses the **anon** key in `js/config.js`. There is no service_role in client JS. Writes go through `SECURITY DEFINER` RPCs. Recency RPCs: `log_slalom_set`, `delete_slalom_log`, `log_kneeboard_trick`, `delete_kneeboard_log`, `club_recency`, `toggle_log_high_five`, `add_log_comment`, `delete_log_comment`. Photo RPCs: `prepare_kneeboard_photo`, `register_kneeboard_photo`, `view_kneeboard_photo`, `remove_kneeboard_photo`, `rollback_kneeboard_photo_upload`, `kneeboard_photos_for_logs`. Join RPCs: `request_club_join`, `add_junior`, `list_clubs` (or `select` on `public.clubs`), `ensure_temp_admin`, `my_club_state(p_club_id)`. `consume_invite` / `create_named_invite` stay for leftover tokens.

Temporary admin: `joel.hageman@gmail.com` / Joel Hageman is admin + approved member on Ski Paradise Cleveland, Adams Lake, and Ski Pond only. `claim_first_admin()` still claims SPC if `club_admins` is empty. `ensure_temp_admin()` backfills those three named clubs when that email signs in. Do not hardcode other admin emails. He adds other admins in `app/admin.html`.
