-- lake.world project zejficslgaqryxrndfqi only.
-- Selected-club log writes and social actions for the multi-club Club hub.
-- Apply after merge in the lake.world Supabase SQL editor. Do not run against any other project.

begin;

-- Replace the older argument lists so PostgREST has one unambiguous signature per RPC.
drop function if exists public.log_slalom_set(uuid, uuid, integer, integer, numeric);
drop function if exists public.delete_slalom_log(uuid);
drop function if exists public.log_kneeboard_trick(uuid, uuid, timestamptz, text, text);
drop function if exists public.delete_kneeboard_log(uuid);
drop function if exists public.toggle_log_high_five(text, uuid);
drop function if exists public.add_log_comment(text, uuid, text);
drop function if exists public.delete_log_comment(uuid);

create or replace function public.log_slalom_set(
  p_id uuid, p_member_id uuid, p_off integer, p_mph integer, p_buoys numeric, p_club_id uuid
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_signed_in'); end if;
  if p_club_id is null or not exists (
    select 1 from public.members m where m.id = p_member_id and m.club_id = p_club_id
  ) then return jsonb_build_object('ok', false, 'error', 'not_your_log'); end if;
  if not public.lake_can_write_member(p_member_id) then
    return jsonb_build_object('ok', false, 'error', 'not_your_log');
  end if;
  if p_off not in (15, 22, 28, 32) or p_mph not in (28, 30, 32, 34, 36)
     or p_buoys is null or p_buoys < 1 or p_buoys > 6
     or (p_buoys * 2) <> trunc(p_buoys * 2) then
    return jsonb_build_object('ok', false, 'error', 'bad_set');
  end if;
  new_id := coalesce(p_id, gen_random_uuid());
  insert into public.slalom_logs (id, club_id, member_id, logged_at, off, mph, buoys, created_by)
  values (new_id, p_club_id, p_member_id, now(), p_off, p_mph, p_buoys, uid)
  on conflict (id) do nothing;
  return jsonb_build_object('ok', true, 'id', new_id);
end;
$$;

create or replace function public.delete_slalom_log(p_id uuid, p_club_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare uid uuid := auth.uid(); rec public.slalom_logs%rowtype;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_signed_in'); end if;
  select * into rec from public.slalom_logs where id = p_id and club_id = p_club_id;
  if rec.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if not public.lake_can_write_member(rec.member_id) then
    return jsonb_build_object('ok', false, 'error', 'not_your_log');
  end if;
  delete from public.slalom_logs where id = rec.id and club_id = p_club_id;
  return jsonb_build_object('ok', true, 'id', rec.id);
end;
$$;

create or replace function public.log_kneeboard_trick(
  p_id uuid, p_member_id uuid, p_logged_at timestamptz, p_trick_name text, p_mode text, p_club_id uuid
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
  clean text;
  clean_mode text;
  at_time timestamptz;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_signed_in'); end if;
  if p_club_id is null or not exists (
    select 1 from public.members m where m.id = p_member_id and m.club_id = p_club_id
  ) then return jsonb_build_object('ok', false, 'error', 'not_your_log'); end if;
  if not public.lake_can_write_member(p_member_id) then
    return jsonb_build_object('ok', false, 'error', 'not_your_log');
  end if;
  clean := public.lake_clean_name(p_trick_name);
  if clean is null or char_length(clean) > 80 then
    return jsonb_build_object('ok', false, 'error', 'bad_trick');
  end if;
  clean_mode := case when p_mode = 'hard' then 'hard' else 'easy' end;
  at_time := coalesce(p_logged_at, now());
  new_id := coalesce(p_id, gen_random_uuid());
  insert into public.kneeboard_logs (id, club_id, member_id, logged_at, trick_name, mode, created_by)
  values (new_id, p_club_id, p_member_id, at_time, clean, clean_mode, uid)
  on conflict (id) do update
    set logged_at = excluded.logged_at, trick_name = excluded.trick_name, mode = excluded.mode
    where public.kneeboard_logs.club_id = p_club_id
      and public.kneeboard_logs.member_id = p_member_id
      and public.lake_can_write_member(public.kneeboard_logs.member_id);
  return jsonb_build_object('ok', true, 'id', new_id);
end;
$$;

create or replace function public.delete_kneeboard_log(p_id uuid, p_club_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare uid uuid := auth.uid(); rec public.kneeboard_logs%rowtype;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_signed_in'); end if;
  select * into rec from public.kneeboard_logs where id = p_id and club_id = p_club_id;
  if rec.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if not public.lake_can_write_member(rec.member_id) then
    return jsonb_build_object('ok', false, 'error', 'not_your_log');
  end if;
  delete from public.kneeboard_logs where id = rec.id and club_id = p_club_id;
  return jsonb_build_object('ok', true, 'id', rec.id);
end;
$$;

create or replace function public.toggle_log_high_five(p_kind text, p_log_id uuid, p_club_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid(); mid uuid; rec_id uuid; log_club uuid; on_now boolean; cnt integer;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_signed_in'); end if;
  select m.id into mid from public.members m
  where m.club_id = p_club_id and m.user_id = uid and not m.is_junior and m.status = 'approved' limit 1;
  if mid is null then return jsonb_build_object('ok', false, 'error', 'not_a_member'); end if;
  if p_kind = 'slalom' then select club_id into log_club from public.slalom_logs where id = p_log_id;
  elsif p_kind = 'kneeboard' then select club_id into log_club from public.kneeboard_logs where id = p_log_id;
  else return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if log_club is distinct from p_club_id then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select id into rec_id from public.log_high_fives
  where club_id = p_club_id and kind = p_kind and log_id = p_log_id and member_id = mid limit 1;
  if rec_id is null then
    insert into public.log_high_fives (club_id, kind, log_id, member_id, created_by)
    values (p_club_id, p_kind, p_log_id, mid, uid); on_now := true;
  else delete from public.log_high_fives where id = rec_id; on_now := false;
  end if;
  select count(*)::integer into cnt from public.log_high_fives
  where club_id = p_club_id and kind = p_kind and log_id = p_log_id;
  return jsonb_build_object('ok', true, 'on', on_now, 'count', cnt, 'kind', p_kind, 'log_id', p_log_id);
end;
$$;

create or replace function public.add_log_comment(p_kind text, p_log_id uuid, p_body text, p_club_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare uid uuid := auth.uid(); mid uuid; log_club uuid; clean text; new_id uuid;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_signed_in'); end if;
  select m.id into mid from public.members m
  where m.club_id = p_club_id and m.user_id = uid and not m.is_junior and m.status = 'approved' limit 1;
  if mid is null then return jsonb_build_object('ok', false, 'error', 'not_a_member'); end if;
  if p_kind = 'slalom' then select club_id into log_club from public.slalom_logs where id = p_log_id;
  elsif p_kind = 'kneeboard' then select club_id into log_club from public.kneeboard_logs where id = p_log_id;
  else return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if log_club is distinct from p_club_id then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  clean := nullif(btrim(regexp_replace(coalesce(p_body, ''), '\s+', ' ', 'g')), '');
  if clean is null or char_length(clean) > 280 then
    return jsonb_build_object('ok', false, 'error', 'bad_comment');
  end if;
  insert into public.log_comments (club_id, kind, log_id, member_id, created_by, body)
  values (p_club_id, p_kind, p_log_id, mid, uid, clean) returning id into new_id;
  return jsonb_build_object('ok', true, 'id', new_id);
end;
$$;

create or replace function public.delete_log_comment(p_id uuid, p_club_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare uid uuid := auth.uid(); mid uuid; rec public.log_comments%rowtype;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_signed_in'); end if;
  select m.id into mid from public.members m
  where m.club_id = p_club_id and m.user_id = uid and not m.is_junior and m.status = 'approved' limit 1;
  if mid is null then return jsonb_build_object('ok', false, 'error', 'not_a_member'); end if;
  select * into rec from public.log_comments where id = p_id and club_id = p_club_id;
  if rec.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if rec.created_by <> uid then return jsonb_build_object('ok', false, 'error', 'not_your_comment'); end if;
  delete from public.log_comments where id = rec.id and club_id = p_club_id;
  return jsonb_build_object('ok', true, 'id', rec.id);
end;
$$;

revoke all on function public.log_slalom_set(uuid, uuid, integer, integer, numeric, uuid) from public, anon, authenticated;
revoke all on function public.delete_slalom_log(uuid, uuid) from public, anon, authenticated;
revoke all on function public.log_kneeboard_trick(uuid, uuid, timestamptz, text, text, uuid) from public, anon, authenticated;
revoke all on function public.delete_kneeboard_log(uuid, uuid) from public, anon, authenticated;
revoke all on function public.toggle_log_high_five(text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.add_log_comment(text, uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.delete_log_comment(uuid, uuid) from public, anon, authenticated;

grant execute on function public.log_slalom_set(uuid, uuid, integer, integer, numeric, uuid) to authenticated;
grant execute on function public.delete_slalom_log(uuid, uuid) to authenticated;
grant execute on function public.log_kneeboard_trick(uuid, uuid, timestamptz, text, text, uuid) to authenticated;
grant execute on function public.delete_kneeboard_log(uuid, uuid) to authenticated;
grant execute on function public.toggle_log_high_five(text, uuid, uuid) to authenticated;
grant execute on function public.add_log_comment(text, uuid, text, uuid) to authenticated;
grant execute on function public.delete_log_comment(uuid, uuid) to authenticated;

-- Strict selected-club reader. It rejects missing/unapproved memberships before delegating
-- to the established row-shape implementation used by comments and High fives.
create or replace function public.club_sport_recency(p_limit integer, p_club_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'not_signed_in'); end if;
  if p_club_id is null or not exists (
    select 1 from public.members m
    where m.club_id = p_club_id and m.user_id = auth.uid()
      and not m.is_junior and m.status = 'approved'
  ) then return jsonb_build_object('ok', false, 'error', 'not_a_member'); end if;
  return public.club_recency(p_limit, p_club_id);
end;
$$;
revoke all on function public.club_sport_recency(integer, uuid) from public, anon, authenticated;
grant execute on function public.club_sport_recency(integer, uuid) to authenticated;

commit;
