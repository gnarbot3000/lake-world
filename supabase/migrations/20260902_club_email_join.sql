-- lake.world club email join (pick a club, admin approves)
-- Run in lake.world SQL editor only, project zejficslgaqryxrndfqi
-- (https://zejficslgaqryxrndfqi.supabase.co). NEVER TurnKay zvjhpsvnipugsghqlqvw.
--
-- Product:
--   Anyone with an account can request to join a club by email. They pick a
--   club, sit PENDING, and an admin approves.
--   Clubs (only these three): Ski Paradise Cleveland, Adams Lake, Ski Pond.
--   joel.hageman@gmail.com is the temporary admin AND an approved member
--   named Joel Hageman on all three. Do not invent other members. Do not
--   auto-grant that email on later clubs.
--   If that auth user is missing when this runs, clubs are still inserted;
--   login as that email runs ensure_temp_admin() for those three names.
--   Invite copy-link is leftover: consume_invite / create_named_invite stay.
--   Juniors: approved adult adds in-app (pending). No public create-a-club.
--   my_club_state(p_club_id) uses the selected club (or last membership:
--   approved, then pending, then denied). Do not always use lake_club_id().
--
-- Static site uses the anon key only. Writes go through these functions.
-- Do NOT put service_role in client JS.

insert into public.clubs (name)
values
  ('Ski Paradise Cleveland'),
  ('Adams Lake'),
  ('Ski Pond')
on conflict (name) do nothing;

-- Seed Joel on the three named clubs if the auth user already exists.
do $seed$
declare
  uid uuid;
  club record;
  member_id uuid;
begin
  select u.id into uid
  from auth.users u
  where lower(u.email) = 'joel.hageman@gmail.com'
  limit 1;

  if uid is null then
    raise notice 'joel.hageman@gmail.com has no auth.users row yet; clubs inserted. Login as that email runs ensure_temp_admin().';
    return;
  end if;

  for club in
    select c.id, c.name
    from public.clubs c
    where c.name in ('Ski Paradise Cleveland', 'Adams Lake', 'Ski Pond')
  loop
    insert into public.club_admins (club_id, user_id)
    values (club.id, uid)
    on conflict do nothing;

    select m.id into member_id
    from public.members m
    where m.club_id = club.id
      and m.user_id = uid
      and m.is_junior = false
    limit 1;

    if member_id is null then
      insert into public.members (
        club_id, user_id, display_name, is_junior, status
      ) values (
        club.id, uid, 'Joel Hageman', false, 'approved'
      );
    else
      update public.members
      set status = 'approved',
          display_name = coalesce(nullif(display_name, ''), 'Joel Hageman')
      where id = member_id;
    end if;
  end loop;
end;
$seed$;

-- Temporary-admin helper: only the three named clubs, only that email.
create or replace function public.ensure_temp_admin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  uemail text;
  club record;
  member_id uuid;
  n int := 0;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  uemail := lower(coalesce(auth.jwt() ->> 'email', ''));
  if uemail <> 'joel.hageman@gmail.com' then
    return jsonb_build_object('ok', true, 'skipped', true);
  end if;

  for club in
    select c.id, c.name
    from public.clubs c
    where c.name in ('Ski Paradise Cleveland', 'Adams Lake', 'Ski Pond')
  loop
    insert into public.club_admins (club_id, user_id)
    values (club.id, uid)
    on conflict do nothing;

    select m.id into member_id
    from public.members m
    where m.club_id = club.id
      and m.user_id = uid
      and m.is_junior = false
    limit 1;

    if member_id is null then
      insert into public.members (
        club_id, user_id, display_name, is_junior, status
      ) values (
        club.id, uid, 'Joel Hageman', false, 'approved'
      );
    else
      update public.members
      set status = 'approved',
          display_name = coalesce(nullif(display_name, ''), 'Joel Hageman')
      where id = member_id;
    end if;
    n := n + 1;
  end loop;

  return jsonb_build_object('ok', true, 'clubs', n);
end;
$$;

-- Pick this user's club: requested membership, else approved > pending > denied, else SPC.
create or replace function public.lake_pick_club(p_club_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  club uuid;
begin
  if uid is not null and p_club_id is not null then
    if exists (
      select 1
      from public.members m
      where m.club_id = p_club_id
        and m.user_id = uid
        and m.is_junior = false
    ) then
      return p_club_id;
    end if;
  end if;

  if uid is not null then
    select m.club_id into club
    from public.members m
    where m.user_id = uid
      and m.is_junior = false
    order by case m.status when 'approved' then 0 when 'pending' then 1 else 2 end,
             m.created_at
    limit 1;
    if club is not null then
      return club;
    end if;
  end if;

  return public.lake_club_id();
end;
$$;

create or replace function public.lake_is_approved()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return false;
  end if;
  return exists (
    select 1
    from public.members m
    where m.user_id = uid
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
  me public.members%rowtype;
  target public.members%rowtype;
begin
  if uid is null or p_member_id is null then
    return false;
  end if;

  select * into target from public.members where id = p_member_id limit 1;
  if target.id is null then
    return false;
  end if;

  select * into me
  from public.members m
  where m.club_id = target.club_id
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

  if target.is_junior
     and target.parent_member_id = me.id
     and target.status = 'approved' then
    return true;
  end if;

  return false;
end;
$$;

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
  club := public.lake_pick_club(null);
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

drop policy if exists slalom_logs_select_approved on public.slalom_logs;
create policy slalom_logs_select_approved
  on public.slalom_logs
  for select
  to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.user_id = auth.uid()
        and m.club_id = slalom_logs.club_id
        and m.is_junior = false
        and m.status = 'approved'
    )
  );

drop policy if exists slalom_logs_insert_own on public.slalom_logs;
create policy slalom_logs_insert_own
  on public.slalom_logs
  for insert
  to authenticated
  with check (
    public.lake_can_write_member(member_id)
    and created_by = auth.uid()
    and club_id = (select m.club_id from public.members m where m.id = member_id)
  );

drop policy if exists kneeboard_logs_select_approved on public.kneeboard_logs;
create policy kneeboard_logs_select_approved
  on public.kneeboard_logs
  for select
  to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.user_id = auth.uid()
        and m.club_id = kneeboard_logs.club_id
        and m.is_junior = false
        and m.status = 'approved'
    )
  );

drop policy if exists kneeboard_logs_insert_own on public.kneeboard_logs;
create policy kneeboard_logs_insert_own
  on public.kneeboard_logs
  for insert
  to authenticated
  with check (
    public.lake_can_write_member(member_id)
    and created_by = auth.uid()
    and club_id = (select m.club_id from public.members m where m.id = member_id)
  );

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

  select m.club_id into club from public.members m where m.id = p_member_id limit 1;
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

  select m.club_id into club from public.members m where m.id = p_member_id limit 1;
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

drop function if exists public.club_recency(integer);
create or replace function public.club_recency(p_limit integer default 50, p_club_id uuid default null)
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

  club := public.lake_pick_club(p_club_id);
  if club is null then
    return jsonb_build_object('ok', false, 'error', 'club_missing');
  end if;

  select m.id into me_id
  from public.members m
  where m.club_id = club
    and m.user_id = uid
    and m.is_junior = false
    and m.status = 'approved'
  limit 1;

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

create or replace function public.set_member_status(p_member_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  is_admin boolean;
  rec public.members%rowtype;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  if p_status not in ('pending', 'approved', 'denied') then
    return jsonb_build_object('ok', false, 'error', 'bad_status');
  end if;

  select * into rec from public.members where id = p_member_id;
  if rec.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select exists (
    select 1 from public.club_admins a
    where a.club_id = rec.club_id and a.user_id = uid
  ) into is_admin;

  if not is_admin then
    return jsonb_build_object('ok', false, 'error', 'not_admin');
  end if;

  update public.members set status = p_status where id = rec.id;

  return jsonb_build_object('ok', true, 'id', rec.id, 'status', p_status);
end;
$$;

drop function if exists public.add_club_admin(uuid);
create or replace function public.add_club_admin(p_user_id uuid, p_club_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  club uuid;
  is_admin boolean;
  target public.members%rowtype;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  club := public.lake_pick_club(p_club_id);

  select exists (
    select 1 from public.club_admins a where a.club_id = club and a.user_id = uid
  ) into is_admin;

  if not is_admin then
    return jsonb_build_object('ok', false, 'error', 'not_admin');
  end if;

  select * into target
  from public.members m
  where m.club_id = club
    and m.user_id = p_user_id
    and m.is_junior = false
    and m.status = 'approved'
  limit 1;

  if target.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_approved_adult');
  end if;

  insert into public.club_admins (club_id, user_id)
  values (club, p_user_id)
  on conflict do nothing;

  return jsonb_build_object('ok', true, 'user_id', p_user_id, 'club_id', club);
end;
$$;

drop function if exists public.remove_club_admin(uuid);
create or replace function public.remove_club_admin(p_user_id uuid, p_club_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  club uuid;
  is_admin boolean;
  admin_count int;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  club := public.lake_pick_club(p_club_id);
  select exists (
    select 1 from public.club_admins a where a.club_id = club and a.user_id = uid
  ) into is_admin;

  if not is_admin then
    return jsonb_build_object('ok', false, 'error', 'not_admin');
  end if;

  select count(*) into admin_count from public.club_admins where club_id = club;
  if admin_count <= 1 then
    return jsonb_build_object('ok', false, 'error', 'last_admin');
  end if;

  delete from public.club_admins
  where club_id = club and user_id = p_user_id;

  return jsonb_build_object('ok', true, 'user_id', p_user_id, 'club_id', club);
end;
$$;

create or replace function public.request_club_join(p_club_id uuid, p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  club uuid;
  clean text;
  me public.members%rowtype;
  member_id uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  if p_club_id is null then
    return jsonb_build_object('ok', false, 'error', 'club_missing');
  end if;

  select c.id into club from public.clubs c where c.id = p_club_id limit 1;
  if club is null then
    return jsonb_build_object('ok', false, 'error', 'club_missing');
  end if;

  clean := public.lake_clean_name(p_display_name);
  if clean is null or char_length(clean) > 80 then
    return jsonb_build_object('ok', false, 'error', 'bad_name');
  end if;

  select * into me
  from public.members m
  where m.club_id = club
    and m.user_id = uid
    and m.is_junior = false
  limit 1;

  if me.id is not null then
    return jsonb_build_object(
      'ok', true,
      'member_id', me.id,
      'club_id', me.club_id,
      'display_name', me.display_name,
      'status', me.status,
      'existing', true
    );
  end if;

  begin
    insert into public.members (
      club_id, user_id, display_name, is_junior, status
    ) values (
      club, uid, clean, false, 'pending'
    )
    returning id into member_id;
  exception
    when unique_violation then
      select * into me
      from public.members m
      where m.club_id = club
        and m.user_id = uid
        and m.is_junior = false
      limit 1;
      if me.id is null then
        return jsonb_build_object('ok', false, 'error', 'already_member');
      end if;
      return jsonb_build_object(
        'ok', true,
        'member_id', me.id,
        'club_id', me.club_id,
        'display_name', me.display_name,
        'status', me.status,
        'existing', true
      );
  end;

  return jsonb_build_object(
    'ok', true,
    'member_id', member_id,
    'club_id', club,
    'display_name', clean,
    'status', 'pending'
  );
end;
$$;

drop function if exists public.add_junior(text);
create or replace function public.add_junior(p_display_name text, p_club_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  club uuid;
  me public.members%rowtype;
  clean text;
  member_id uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  clean := public.lake_clean_name(p_display_name);
  if clean is null or char_length(clean) > 80 then
    return jsonb_build_object('ok', false, 'error', 'bad_name');
  end if;

  club := public.lake_pick_club(p_club_id);

  select * into me
  from public.members m
  where m.club_id = club
    and m.user_id = uid
    and m.is_junior = false
    and m.status = 'approved'
  limit 1;

  if me.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_a_member');
  end if;

  insert into public.members (
    club_id, user_id, display_name, is_junior, parent_member_id, status
  ) values (
    me.club_id, null, clean, true, me.id, 'pending'
  )
  returning id into member_id;

  return jsonb_build_object(
    'ok', true,
    'member_id', member_id,
    'club_id', me.club_id,
    'display_name', clean,
    'is_junior', true,
    'status', 'pending',
    'parent_member_id', me.id
  );
end;
$$;

create or replace function public.list_clubs()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.name),
    '[]'::jsonb
  )
  from public.clubs c;
$$;

drop function if exists public.my_club_state();
create or replace function public.my_club_state(p_club_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  club uuid;
  club_name text := 'Ski Paradise Cleveland';
  me public.members%rowtype;
  is_admin boolean := false;
  result jsonb;
begin
  club := public.lake_pick_club(p_club_id);
  if club is null then
    return jsonb_build_object('ok', false, 'error', 'club_missing');
  end if;

  select c.name into club_name from public.clubs c where c.id = club;

  if uid is null then
    return jsonb_build_object(
      'ok', true,
      'club_id', club,
      'club_name', club_name,
      'status', 'guest',
      'is_admin', false,
      'me', null,
      'members', '[]'::jsonb,
      'juniors', '[]'::jsonb,
      'pending', '[]'::jsonb,
      'admins', '[]'::jsonb,
      'invites', '[]'::jsonb,
      'my_clubs', '[]'::jsonb
    );
  end if;

  select m.* into me
  from public.members m
  where m.club_id = club
    and m.user_id = uid
    and m.is_junior = false
  order by case m.status when 'approved' then 0 when 'pending' then 1 else 2 end,
           m.created_at
  limit 1;

  select exists (
    select 1 from public.club_admins a
    where a.club_id = club and a.user_id = uid
  ) into is_admin;

  result := jsonb_build_object(
    'ok', true,
    'club_id', club,
    'club_name', club_name,
    'is_admin', is_admin,
    'status', case when me.id is null then 'none' else me.status end,
    'me', case when me.id is null then null else jsonb_build_object(
      'id', me.id,
      'club_id', me.club_id,
      'user_id', me.user_id,
      'display_name', me.display_name,
      'is_junior', me.is_junior,
      'parent_member_id', me.parent_member_id,
      'status', me.status,
      'invited_by', me.invited_by,
      'created_at', me.created_at
    ) end
  );

  result := result || jsonb_build_object(
    'my_clubs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'status', m.status,
        'is_admin', exists (
          select 1 from public.club_admins a
          where a.club_id = c.id and a.user_id = uid
        )
      ) order by c.name)
      from public.members m
      join public.clubs c on c.id = m.club_id
      where m.user_id = uid
        and m.is_junior = false
    ), '[]'::jsonb)
  );

  if me.id is not null then
    result := result || jsonb_build_object(
      'juniors', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', j.id,
          'display_name', j.display_name,
          'is_junior', j.is_junior,
          'parent_member_id', j.parent_member_id,
          'status', j.status,
          'created_at', j.created_at
        ) order by j.display_name)
        from public.members j
        where j.club_id = club and j.parent_member_id = me.id
      ), '[]'::jsonb)
    );
  else
    result := result || jsonb_build_object('juniors', '[]'::jsonb);
  end if;

  if is_admin or (me.id is not null and me.status = 'approved') then
    result := result || jsonb_build_object(
      'members', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', m.id,
          'user_id', m.user_id,
          'display_name', m.display_name,
          'is_junior', m.is_junior,
          'parent_member_id', m.parent_member_id,
          'status', m.status
        ) order by m.display_name)
        from public.members m
        where m.club_id = club and m.status = 'approved'
      ), '[]'::jsonb)
    );
  else
    result := result || jsonb_build_object('members', '[]'::jsonb);
  end if;

  if is_admin then
    result := result || jsonb_build_object(
      'pending', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', m.id,
          'user_id', m.user_id,
          'display_name', m.display_name,
          'is_junior', m.is_junior,
          'parent_member_id', m.parent_member_id,
          'parent_name', (select p.display_name from public.members p where p.id = m.parent_member_id),
          'status', m.status,
          'created_at', m.created_at
        ) order by m.created_at)
        from public.members m
        where m.club_id = club and m.status = 'pending'
      ), '[]'::jsonb),
      'admins', coalesce((
        select jsonb_agg(jsonb_build_object(
          'user_id', a.user_id,
          'display_name', coalesce(m.display_name, 'Member')
        ) order by coalesce(m.display_name, ''))
        from public.club_admins a
        left join public.members m
          on m.club_id = a.club_id
         and m.user_id = a.user_id
         and m.is_junior = false
        where a.club_id = club
      ), '[]'::jsonb)
    );
  else
    result := result || jsonb_build_object('pending', '[]'::jsonb, 'admins', '[]'::jsonb);
  end if;

  result := result || jsonb_build_object(
    'invites', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'token', i.token,
        'display_name', i.display_name,
        'is_junior', i.is_junior,
        'created_at', i.created_at
      ) order by i.created_at desc)
      from public.invites i
      where i.club_id = club
        and i.consumed_at is null
        and (is_admin or i.created_by = uid)
    ), '[]'::jsonb)
  );

  return result;
end;
$$;

revoke all on function public.ensure_temp_admin() from public, anon, authenticated;
revoke all on function public.lake_pick_club(uuid) from public, anon, authenticated;
revoke all on function public.request_club_join(uuid, text) from public, anon, authenticated;
revoke all on function public.add_junior(text, uuid) from public, anon, authenticated;
revoke all on function public.list_clubs() from public, anon, authenticated;
revoke all on function public.my_club_state(uuid) from public, anon, authenticated;
revoke all on function public.club_recency(integer, uuid) from public, anon, authenticated;
revoke all on function public.add_club_admin(uuid, uuid) from public, anon, authenticated;
revoke all on function public.remove_club_admin(uuid, uuid) from public, anon, authenticated;

grant execute on function public.ensure_temp_admin() to authenticated;
grant execute on function public.request_club_join(uuid, text) to authenticated;
grant execute on function public.add_junior(text, uuid) to authenticated;
grant execute on function public.list_clubs() to authenticated;
grant execute on function public.my_club_state(uuid) to authenticated;
grant execute on function public.club_recency(integer, uuid) to authenticated;
grant execute on function public.add_club_admin(uuid, uuid) to authenticated;
grant execute on function public.remove_club_admin(uuid, uuid) to authenticated;
grant execute on function public.set_member_status(uuid, text) to authenticated;

notify pgrst, 'reload schema';
