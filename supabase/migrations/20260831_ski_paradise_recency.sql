-- lake.world / Ski Paradise Cleveland recency (slalom sets + kneeboard landings)
-- Project: zejficslgaqryxrndfqi (https://zejficslgaqryxrndfqi.supabase.co)
-- Run this WHOLE file in the lake.world SQL editor (Dashboard → SQL).
-- Do NOT run this against TurnKay / vinyl-archive (zvjhpsvnipugsghqlqvw).
--
-- Product:
--   Approved members (and their approved juniors) share a newest-first recency
--   list. Guests and pending users cannot read other people's logs.
--   Members insert only for themselves and their juniors. Delete own.
--   High fives (one per member per log, toggle off) and short comments on logs.
--   Do not seed any performances. Personal Mini history can stay local.
--
-- Static site uses the anon key only. Writes go through these functions.

create table if not exists public.slalom_logs (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  logged_at timestamptz not null default now(),
  off integer not null,
  mph integer not null,
  buoys numeric(3, 1) not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint slalom_logs_off_chk check (off in (15, 22, 28, 32)),
  constraint slalom_logs_mph_chk check (mph in (28, 30, 32, 34, 36)),
  constraint slalom_logs_buoys_chk check (buoys >= 1 and buoys <= 6 and (buoys * 2) = trunc(buoys * 2))
);

create index if not exists slalom_logs_recency_idx
  on public.slalom_logs (club_id, logged_at desc);

create index if not exists slalom_logs_member_idx
  on public.slalom_logs (member_id, logged_at desc);

create table if not exists public.kneeboard_logs (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  logged_at timestamptz not null default now(),
  trick_name text not null,
  mode text not null check (mode in ('easy', 'hard')),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint kneeboard_logs_name_chk check (char_length(trick_name) between 1 and 80)
);

create index if not exists kneeboard_logs_recency_idx
  on public.kneeboard_logs (club_id, logged_at desc);

create index if not exists kneeboard_logs_member_idx
  on public.kneeboard_logs (member_id, logged_at desc);

alter table public.slalom_logs enable row level security;
alter table public.kneeboard_logs enable row level security;

revoke all on table public.slalom_logs from anon, authenticated, public;
revoke all on table public.kneeboard_logs from anon, authenticated, public;

-- ---------------------------------------------------------------------------
-- helpers (security definer so RLS can see members)
-- ---------------------------------------------------------------------------

create or replace function public.lake_is_approved()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  club uuid;
begin
  if uid is null then
    return false;
  end if;
  club := public.lake_club_id();
  if club is null then
    return false;
  end if;
  return exists (
    select 1
    from public.members m
    where m.club_id = club
      and m.user_id = uid
      and m.is_junior = false
      and m.status = 'approved'
  );
end;
$$;

create or replace function public.lake_can_write_member(p_member_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  club uuid;
  me public.members%rowtype;
  target public.members%rowtype;
begin
  if uid is null or p_member_id is null then
    return false;
  end if;
  club := public.lake_club_id();
  if club is null then
    return false;
  end if;

  select * into me
  from public.members m
  where m.club_id = club
    and m.user_id = uid
    and m.is_junior = false
    and m.status = 'approved'
  limit 1;

  if me.id is null then
    return false;
  end if;

  if me.id = p_member_id then
    return true;
  end if;

  select * into target
  from public.members
  where id = p_member_id
    and club_id = club
  limit 1;

  if target.id is null then
    return false;
  end if;

  if target.is_junior
     and target.parent_member_id = me.id
     and target.status = 'approved' then
    return true;
  end if;

  return false;
end;
$$;

-- Approved members may read club recency; insert/delete only for self + juniors.
drop policy if exists slalom_logs_select_approved on public.slalom_logs;
create policy slalom_logs_select_approved
  on public.slalom_logs
  for select
  to authenticated
  using (public.lake_is_approved());

drop policy if exists slalom_logs_insert_own on public.slalom_logs;
create policy slalom_logs_insert_own
  on public.slalom_logs
  for insert
  to authenticated
  with check (
    public.lake_can_write_member(member_id)
    and created_by = auth.uid()
    and club_id = public.lake_club_id()
  );

drop policy if exists slalom_logs_delete_own on public.slalom_logs;
create policy slalom_logs_delete_own
  on public.slalom_logs
  for delete
  to authenticated
  using (public.lake_can_write_member(member_id));

drop policy if exists kneeboard_logs_select_approved on public.kneeboard_logs;
create policy kneeboard_logs_select_approved
  on public.kneeboard_logs
  for select
  to authenticated
  using (public.lake_is_approved());

drop policy if exists kneeboard_logs_insert_own on public.kneeboard_logs;
create policy kneeboard_logs_insert_own
  on public.kneeboard_logs
  for insert
  to authenticated
  with check (
    public.lake_can_write_member(member_id)
    and created_by = auth.uid()
    and club_id = public.lake_club_id()
  );

drop policy if exists kneeboard_logs_delete_own on public.kneeboard_logs;
create policy kneeboard_logs_delete_own
  on public.kneeboard_logs
  for delete
  to authenticated
  using (public.lake_can_write_member(member_id));

grant select, insert, delete on table public.slalom_logs to authenticated;
grant select, insert, delete on table public.kneeboard_logs to authenticated;

-- ---------------------------------------------------------------------------
-- write RPCs
-- ---------------------------------------------------------------------------

create or replace function public.log_slalom_set(
  p_id uuid,
  p_member_id uuid,
  p_off integer,
  p_mph integer,
  p_buoys numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  club uuid;
  new_id uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  club := public.lake_club_id();
  if club is null then
    return jsonb_build_object('ok', false, 'error', 'club_missing');
  end if;

  if not public.lake_can_write_member(p_member_id) then
    return jsonb_build_object('ok', false, 'error', 'not_your_log');
  end if;

  if p_off not in (15, 22, 28, 32)
     or p_mph not in (28, 30, 32, 34, 36)
     or p_buoys is null
     or p_buoys < 1
     or p_buoys > 6
     or (p_buoys * 2) <> trunc(p_buoys * 2) then
    return jsonb_build_object('ok', false, 'error', 'bad_set');
  end if;

  new_id := coalesce(p_id, gen_random_uuid());

  insert into public.slalom_logs (
    id, club_id, member_id, logged_at, off, mph, buoys, created_by
  ) values (
    new_id, club, p_member_id, now(), p_off, p_mph, p_buoys, uid
  )
  on conflict (id) do nothing;

  return jsonb_build_object('ok', true, 'id', new_id);
end;
$$;

create or replace function public.delete_slalom_log(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rec public.slalom_logs%rowtype;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  if p_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into rec from public.slalom_logs where id = p_id;
  if rec.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not public.lake_can_write_member(rec.member_id) then
    return jsonb_build_object('ok', false, 'error', 'not_your_log');
  end if;

  delete from public.slalom_logs where id = rec.id;
  return jsonb_build_object('ok', true, 'id', rec.id);
end;
$$;

create or replace function public.log_kneeboard_trick(
  p_id uuid,
  p_member_id uuid,
  p_logged_at timestamptz,
  p_trick_name text,
  p_mode text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  club uuid;
  new_id uuid;
  clean text;
  mode text;
  at timestamptz;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  club := public.lake_club_id();
  if club is null then
    return jsonb_build_object('ok', false, 'error', 'club_missing');
  end if;

  if not public.lake_can_write_member(p_member_id) then
    return jsonb_build_object('ok', false, 'error', 'not_your_log');
  end if;

  clean := public.lake_clean_name(p_trick_name);
  if clean is null or char_length(clean) > 80 then
    return jsonb_build_object('ok', false, 'error', 'bad_trick');
  end if;

  mode := case when p_mode = 'hard' then 'hard' else 'easy' end;
  at := coalesce(p_logged_at, now());
  new_id := coalesce(p_id, gen_random_uuid());

  insert into public.kneeboard_logs (
    id, club_id, member_id, logged_at, trick_name, mode, created_by
  ) values (
    new_id, club, p_member_id, at, clean, mode, uid
  )
  on conflict (id) do update
    set logged_at = excluded.logged_at,
        trick_name = excluded.trick_name,
        mode = excluded.mode
    where public.lake_can_write_member(public.kneeboard_logs.member_id);

  return jsonb_build_object('ok', true, 'id', new_id);
end;
$$;

create or replace function public.delete_kneeboard_log(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rec public.kneeboard_logs%rowtype;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  if p_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into rec from public.kneeboard_logs where id = p_id;
  if rec.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not public.lake_can_write_member(rec.member_id) then
    return jsonb_build_object('ok', false, 'error', 'not_your_log');
  end if;

  delete from public.kneeboard_logs where id = rec.id;
  return jsonb_build_object('ok', true, 'id', rec.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- recency: mixed slalom + kneeboard, newest first
-- ---------------------------------------------------------------------------

create or replace function public.club_recency(p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  club uuid;
  lim integer;
  rows jsonb;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  club := public.lake_club_id();
  if club is null then
    return jsonb_build_object('ok', false, 'error', 'club_missing');
  end if;

  if not public.lake_is_approved() then
    return jsonb_build_object('ok', false, 'error', 'not_a_member');
  end if;

  lim := least(greatest(coalesce(p_limit, 50), 1), 100);

  select coalesce(jsonb_agg(q.row order by q.logged_at desc), '[]'::jsonb)
  into rows
  from (
    select
      x.logged_at,
      jsonb_build_object(
        'kind', x.kind,
        'id', x.id,
        'member_id', x.member_id,
        'display_name', x.display_name,
        'is_junior', x.is_junior,
        'logged_at', x.logged_at,
        'off', x.off,
        'mph', x.mph,
        'buoys', x.buoys,
        'trick_name', x.trick_name,
        'mode', x.mode
      ) as row
    from (
      select
        'slalom'::text as kind,
        s.id,
        s.member_id,
        m.display_name,
        m.is_junior,
        s.logged_at,
        s.off,
        s.mph,
        s.buoys,
        null::text as trick_name,
        null::text as mode
      from public.slalom_logs s
      join public.members m on m.id = s.member_id
      where s.club_id = club
        and m.status = 'approved'
      union all
      select
        'kneeboard'::text,
        k.id,
        k.member_id,
        m.display_name,
        m.is_junior,
        k.logged_at,
        null::integer,
        null::integer,
        null::numeric,
        k.trick_name,
        k.mode
      from public.kneeboard_logs k
      join public.members m on m.id = k.member_id
      where k.club_id = club
        and m.status = 'approved'
    ) x
    order by x.logged_at desc
    limit lim
  ) q;

  return jsonb_build_object('ok', true, 'rows', rows);
end;
$$;

revoke all on function public.lake_is_approved() from public, anon, authenticated;
revoke all on function public.lake_can_write_member(uuid) from public, anon, authenticated;
revoke all on function public.log_slalom_set(uuid, uuid, integer, integer, numeric) from public, anon, authenticated;
revoke all on function public.delete_slalom_log(uuid) from public, anon, authenticated;
revoke all on function public.log_kneeboard_trick(uuid, uuid, timestamptz, text, text) from public, anon, authenticated;
revoke all on function public.delete_kneeboard_log(uuid) from public, anon, authenticated;
revoke all on function public.club_recency(integer) from public, anon, authenticated;

grant execute on function public.lake_is_approved() to authenticated;
grant execute on function public.lake_can_write_member(uuid) to authenticated;
grant execute on function public.log_slalom_set(uuid, uuid, integer, integer, numeric) to authenticated;
grant execute on function public.delete_slalom_log(uuid) to authenticated;
grant execute on function public.log_kneeboard_trick(uuid, uuid, timestamptz, text, text) to authenticated;
grant execute on function public.delete_kneeboard_log(uuid) to authenticated;
grant execute on function public.club_recency(integer) to authenticated;


-- ---------------------------------------------------------------------------
-- High fives + comments (approved members only)
-- ---------------------------------------------------------------------------

create table if not exists public.log_high_fives (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  kind text not null check (kind in ('slalom', 'kneeboard')),
  log_id uuid not null,
  member_id uuid not null references public.members (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (club_id, kind, log_id, member_id)
);

create index if not exists log_high_fives_log_idx
  on public.log_high_fives (kind, log_id);

create table if not exists public.log_comments (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  kind text not null check (kind in ('slalom', 'kneeboard')),
  log_id uuid not null,
  member_id uuid not null references public.members (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint log_comments_body_chk check (char_length(body) between 1 and 280)
);

create index if not exists log_comments_log_idx
  on public.log_comments (kind, log_id, created_at);

alter table public.log_high_fives enable row level security;
alter table public.log_comments enable row level security;

revoke all on table public.log_high_fives from anon, authenticated, public;
revoke all on table public.log_comments from anon, authenticated, public;

drop policy if exists log_high_fives_select_approved on public.log_high_fives;
create policy log_high_fives_select_approved
  on public.log_high_fives for select to authenticated
  using (public.lake_is_approved());

drop policy if exists log_high_fives_insert_own on public.log_high_fives;
create policy log_high_fives_insert_own
  on public.log_high_fives for insert to authenticated
  with check (public.lake_is_approved() and created_by = auth.uid());

drop policy if exists log_high_fives_delete_own on public.log_high_fives;
create policy log_high_fives_delete_own
  on public.log_high_fives for delete to authenticated
  using (created_by = auth.uid() and public.lake_is_approved());

drop policy if exists log_comments_select_approved on public.log_comments;
create policy log_comments_select_approved
  on public.log_comments for select to authenticated
  using (public.lake_is_approved());

drop policy if exists log_comments_insert_own on public.log_comments;
create policy log_comments_insert_own
  on public.log_comments for insert to authenticated
  with check (public.lake_is_approved() and created_by = auth.uid());

drop policy if exists log_comments_delete_own on public.log_comments;
create policy log_comments_delete_own
  on public.log_comments for delete to authenticated
  using (created_by = auth.uid() and public.lake_is_approved());

grant select, insert, delete on table public.log_high_fives to authenticated;
grant select, insert, delete on table public.log_comments to authenticated;

create or replace function public.lake_my_member_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  club uuid;
  mid uuid;
begin
  if uid is null then
    return null;
  end if;
  club := public.lake_club_id();
  select m.id into mid
  from public.members m
  where m.club_id = club
    and m.user_id = uid
    and m.is_junior = false
    and m.status = 'approved'
  limit 1;
  return mid;
end;
$$;

create or replace function public.lake_log_exists(p_kind text, p_log_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_log_id is null then
    return false;
  end if;
  if p_kind = 'slalom' then
    return exists (select 1 from public.slalom_logs where id = p_log_id);
  end if;
  if p_kind = 'kneeboard' then
    return exists (select 1 from public.kneeboard_logs where id = p_log_id);
  end if;
  return false;
end;
$$;

create or replace function public.lake_scrub_log_social()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  k text;
begin
  k := case TG_TABLE_NAME
    when 'slalom_logs' then 'slalom'
    when 'kneeboard_logs' then 'kneeboard'
    else null
  end;
  if k is not null then
    delete from public.log_high_fives where kind = k and log_id = old.id;
    delete from public.log_comments where kind = k and log_id = old.id;
  end if;
  return old;
end;
$$;

drop trigger if exists slalom_logs_scrub_social on public.slalom_logs;
create trigger slalom_logs_scrub_social
  before delete on public.slalom_logs
  for each row execute function public.lake_scrub_log_social();

drop trigger if exists kneeboard_logs_scrub_social on public.kneeboard_logs;
create trigger kneeboard_logs_scrub_social
  before delete on public.kneeboard_logs
  for each row execute function public.lake_scrub_log_social();

create or replace function public.toggle_log_high_five(p_kind text, p_log_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  club uuid;
  mid uuid;
  rec_id uuid;
  on_now boolean;
  cnt int;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;
  club := public.lake_club_id();
  if club is null then
    return jsonb_build_object('ok', false, 'error', 'club_missing');
  end if;
  mid := public.lake_my_member_id();
  if mid is null then
    return jsonb_build_object('ok', false, 'error', 'not_a_member');
  end if;
  if p_kind not in ('slalom', 'kneeboard') or not public.lake_log_exists(p_kind, p_log_id) then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select id into rec_id
  from public.log_high_fives
  where club_id = club and kind = p_kind and log_id = p_log_id and member_id = mid
  limit 1;

  if rec_id is not null then
    delete from public.log_high_fives where id = rec_id;
    on_now := false;
  else
    insert into public.log_high_fives (club_id, kind, log_id, member_id, created_by)
    values (club, p_kind, p_log_id, mid, uid);
    on_now := true;
  end if;

  select count(*)::int into cnt
  from public.log_high_fives
  where kind = p_kind and log_id = p_log_id;

  return jsonb_build_object('ok', true, 'on', on_now, 'count', cnt, 'kind', p_kind, 'log_id', p_log_id);
end;
$$;

create or replace function public.add_log_comment(p_kind text, p_log_id uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  club uuid;
  mid uuid;
  clean text;
  new_id uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;
  club := public.lake_club_id();
  if club is null then
    return jsonb_build_object('ok', false, 'error', 'club_missing');
  end if;
  mid := public.lake_my_member_id();
  if mid is null then
    return jsonb_build_object('ok', false, 'error', 'not_a_member');
  end if;
  if p_kind not in ('slalom', 'kneeboard') or not public.lake_log_exists(p_kind, p_log_id) then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  clean := nullif(btrim(regexp_replace(coalesce(p_body, ''), '\s+', ' ', 'g')), '');
  if clean is null or char_length(clean) > 280 then
    return jsonb_build_object('ok', false, 'error', 'bad_comment');
  end if;

  insert into public.log_comments (club_id, kind, log_id, member_id, created_by, body)
  values (club, p_kind, p_log_id, mid, uid, clean)
  returning id into new_id;

  return jsonb_build_object('ok', true, 'id', new_id);
end;
$$;

create or replace function public.delete_log_comment(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rec public.log_comments%rowtype;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;
  if p_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if not public.lake_is_approved() then
    return jsonb_build_object('ok', false, 'error', 'not_a_member');
  end if;

  select * into rec from public.log_comments where id = p_id;
  if rec.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if rec.created_by <> uid then
    return jsonb_build_object('ok', false, 'error', 'not_your_comment');
  end if;

  delete from public.log_comments where id = rec.id;
  return jsonb_build_object('ok', true, 'id', rec.id);
end;
$$;

create or replace function public.club_recency(p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  club uuid;
  me_id uuid;
  lim integer;
  rows jsonb;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  club := public.lake_club_id();
  if club is null then
    return jsonb_build_object('ok', false, 'error', 'club_missing');
  end if;

  me_id := public.lake_my_member_id();
  if me_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_a_member');
  end if;

  lim := least(greatest(coalesce(p_limit, 50), 1), 100);

  select coalesce(jsonb_agg(q.row order by q.logged_at desc), '[]'::jsonb)
  into rows
  from (
    select
      x.logged_at,
      jsonb_build_object(
        'kind', x.kind,
        'id', x.id,
        'member_id', x.member_id,
        'display_name', x.display_name,
        'is_junior', x.is_junior,
        'logged_at', x.logged_at,
        'off', x.off,
        'mph', x.mph,
        'buoys', x.buoys,
        'trick_name', x.trick_name,
        'mode', x.mode,
        'high_fives', (
          select count(*)::int from public.log_high_fives hf
          where hf.kind = x.kind and hf.log_id = x.id
        ),
        'i_high_five', exists (
          select 1 from public.log_high_fives hf
          where hf.kind = x.kind and hf.log_id = x.id and hf.member_id = me_id
        ),
        'comments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', c.id,
            'display_name', cm.display_name,
            'body', c.body,
            'created_at', c.created_at,
            'mine', c.member_id = me_id
          ) order by c.created_at)
          from public.log_comments c
          join public.members cm on cm.id = c.member_id
          where c.kind = x.kind and c.log_id = x.id
        ), '[]'::jsonb)
      ) as row
    from (
      select
        'slalom'::text as kind,
        s.id,
        s.member_id,
        m.display_name,
        m.is_junior,
        s.logged_at,
        s.off,
        s.mph,
        s.buoys,
        null::text as trick_name,
        null::text as mode
      from public.slalom_logs s
      join public.members m on m.id = s.member_id
      where s.club_id = club
        and m.status = 'approved'
      union all
      select
        'kneeboard'::text,
        k.id,
        k.member_id,
        m.display_name,
        m.is_junior,
        k.logged_at,
        null::integer,
        null::integer,
        null::numeric,
        k.trick_name,
        k.mode
      from public.kneeboard_logs k
      join public.members m on m.id = k.member_id
      where k.club_id = club
        and m.status = 'approved'
    ) x
    order by x.logged_at desc
    limit lim
  ) q;

  return jsonb_build_object('ok', true, 'rows', rows);
end;
$$;

revoke all on function public.lake_my_member_id() from public, anon, authenticated;
revoke all on function public.lake_log_exists(text, uuid) from public, anon, authenticated;
revoke all on function public.lake_scrub_log_social() from public, anon, authenticated;
revoke all on function public.toggle_log_high_five(text, uuid) from public, anon, authenticated;
revoke all on function public.add_log_comment(text, uuid, text) from public, anon, authenticated;
revoke all on function public.delete_log_comment(uuid) from public, anon, authenticated;

grant execute on function public.lake_my_member_id() to authenticated;
grant execute on function public.lake_log_exists(text, uuid) to authenticated;
grant execute on function public.toggle_log_high_five(text, uuid) to authenticated;
grant execute on function public.add_log_comment(text, uuid, text) to authenticated;
grant execute on function public.delete_log_comment(uuid) to authenticated;

notify pgrst, 'reload schema';
