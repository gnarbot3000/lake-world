-- lake.world / Ski Paradise Cleveland club, invites, admins
-- Project: zejficslgaqryxrndfqi (https://zejficslgaqryxrndfqi.supabase.co)
-- Run this WHOLE file in the lake.world SQL editor (Dashboard → SQL).
-- Do NOT run this against TurnKay / vinyl-archive (zvjhpsvnipugsghqlqvw).
--
-- Product:
--   One club, invite-only. No public create-a-club.
--   First admin: when joel.hageman@gmail.com signs in and the club has
--   no admins yet, claim_first_admin() makes that user the first admin
--   and an approved member named Joel Hageman. He adds other admins in the UI.
--   Invitees sit PENDING until an admin approves. Juniors are tied to the
--   parent who accepted the invite while signed in.
--
-- Static site uses the anon key only. Writes go through these functions.

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  display_name text not null,
  is_junior boolean not null default false,
  parent_member_id uuid references public.members (id) on delete set null,
  status text not null check (status in ('pending', 'approved', 'denied')),
  invited_by uuid references public.members (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists members_club_user_uidx
  on public.members (club_id, user_id)
  where user_id is not null;

create index if not exists members_club_status_idx
  on public.members (club_id, status);

create table if not exists public.club_admins (
  club_id uuid not null references public.clubs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  token text not null unique,
  display_name text not null,
  is_junior boolean not null default false,
  created_by uuid not null references auth.users (id) on delete cascade,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists invites_club_open_idx
  on public.invites (club_id)
  where consumed_at is null;

insert into public.clubs (name)
values ('Ski Paradise Cleveland')
on conflict (name) do nothing;

alter table public.clubs enable row level security;
alter table public.members enable row level security;
alter table public.club_admins enable row level security;
alter table public.invites enable row level security;

revoke all on table public.clubs from anon, authenticated, public;
revoke all on table public.members from anon, authenticated, public;
revoke all on table public.club_admins from anon, authenticated, public;
revoke all on table public.invites from anon, authenticated, public;

drop policy if exists clubs_select_authenticated on public.clubs;
create policy clubs_select_authenticated
  on public.clubs
  for select
  to authenticated
  using (true);

grant select on table public.clubs to authenticated;

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

create or replace function public.lake_club_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.clubs where name = 'Ski Paradise Cleveland' limit 1;
$$;

create or replace function public.lake_clean_name(p_name text)
returns text
language sql
immutable
as $$
  select nullif(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), '');
$$;

-- ---------------------------------------------------------------------------
-- first admin (Joel only, and only while the club has zero admins)
-- ---------------------------------------------------------------------------

create or replace function public.claim_first_admin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  uemail text;
  club uuid;
  admin_count int;
  member_id uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  uemail := lower(coalesce(auth.jwt() ->> 'email', ''));
  club := public.lake_club_id();
  if club is null then
    return jsonb_build_object('ok', false, 'error', 'club_missing');
  end if;

  select count(*) into admin_count from public.club_admins where club_id = club;
  if admin_count > 0 then
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  if uemail <> 'joel.hageman@gmail.com' then
    return jsonb_build_object('ok', false, 'error', 'not_first');
  end if;

  insert into public.club_admins (club_id, user_id)
  values (club, uid)
  on conflict do nothing;

  select m.id into member_id
  from public.members m
  where m.club_id = club and m.user_id = uid and m.is_junior = false
  limit 1;

  if member_id is null then
    insert into public.members (
      club_id, user_id, display_name, is_junior, status
    ) values (
      club, uid, 'Joel Hageman', false, 'approved'
    )
    returning id into member_id;
  else
    update public.members
    set status = 'approved',
        display_name = coalesce(nullif(display_name, ''), 'Joel Hageman')
    where id = member_id;
  end if;

  return jsonb_build_object('ok', true, 'claimed', true, 'member_id', member_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- read current user's club view
-- ---------------------------------------------------------------------------

create or replace function public.my_club_state()
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
  club := public.lake_club_id();
  if club is null then
    return jsonb_build_object('ok', false, 'error', 'club_missing');
  end if;

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
      'invites', '[]'::jsonb
    );
  end if;

  select exists (
    select 1 from public.club_admins a
    where a.club_id = club and a.user_id = uid
  ) into is_admin;

  select * into me
  from public.members m
  where m.club_id = club
    and m.user_id = uid
    and m.is_junior = false
  order by case m.status when 'approved' then 0 when 'pending' then 1 else 2 end,
           m.created_at
  limit 1;

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

-- ---------------------------------------------------------------------------
-- invites
-- ---------------------------------------------------------------------------

create or replace function public.lookup_invite(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  inv public.invites%rowtype;
begin
  if p_token is null or btrim(p_token) = '' then
    return jsonb_build_object('ok', false, 'error', 'invite_invalid');
  end if;

  select * into inv
  from public.invites
  where token = btrim(p_token)
  limit 1;

  if inv.id is null then
    return jsonb_build_object('ok', false, 'error', 'invite_invalid');
  end if;

  if inv.consumed_at is not null then
    return jsonb_build_object(
      'ok', true,
      'consumed', true,
      'display_name', inv.display_name,
      'is_junior', inv.is_junior
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'consumed', false,
    'display_name', inv.display_name,
    'is_junior', inv.is_junior
  );
end;
$$;

create or replace function public.create_named_invite(p_display_name text, p_is_junior boolean)
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
  new_token text;
  inv_id uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  club := public.lake_club_id();
  if club is null then
    return jsonb_build_object('ok', false, 'error', 'club_missing');
  end if;

  select m.id into mid
  from public.members m
  where m.club_id = club
    and m.user_id = uid
    and m.is_junior = false
    and m.status = 'approved'
  limit 1;

  if mid is null then
    return jsonb_build_object('ok', false, 'error', 'not_a_member');
  end if;

  clean := public.lake_clean_name(p_display_name);
  if clean is null or char_length(clean) > 80 then
    return jsonb_build_object('ok', false, 'error', 'bad_name');
  end if;

  new_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  insert into public.invites (club_id, token, display_name, is_junior, created_by)
  values (club, new_token, clean, coalesce(p_is_junior, false), uid)
  returning id into inv_id;

  return jsonb_build_object(
    'ok', true,
    'id', inv_id,
    'token', new_token,
    'display_name', clean,
    'is_junior', coalesce(p_is_junior, false)
  );
end;
$$;

create or replace function public.consume_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  club uuid;
  inv public.invites%rowtype;
  me public.members%rowtype;
  creator_mid uuid;
  member_id uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  club := public.lake_club_id();
  if club is null then
    return jsonb_build_object('ok', false, 'error', 'club_missing');
  end if;

  if p_token is null or btrim(p_token) = '' then
    return jsonb_build_object('ok', false, 'error', 'invite_invalid');
  end if;

  select * into inv
  from public.invites
  where token = btrim(p_token)
  for update;

  if inv.id is null then
    return jsonb_build_object('ok', false, 'error', 'invite_invalid');
  end if;

  if inv.club_id <> club then
    return jsonb_build_object('ok', false, 'error', 'invite_invalid');
  end if;

  if inv.consumed_at is not null then
    return jsonb_build_object('ok', false, 'error', 'invite_consumed');
  end if;

  select m.id into creator_mid
  from public.members m
  where m.club_id = club and m.user_id = inv.created_by and m.is_junior = false
  limit 1;

  if inv.is_junior then
    select * into me
    from public.members m
    where m.club_id = club
      and m.user_id = uid
      and m.is_junior = false
      and m.status = 'approved'
    limit 1;

    if me.id is null then
      return jsonb_build_object('ok', false, 'error', 'parent_not_approved');
    end if;

    insert into public.members (
      club_id, user_id, display_name, is_junior, parent_member_id, status, invited_by
    ) values (
      club, null, inv.display_name, true, me.id, 'pending', coalesce(creator_mid, me.id)
    )
    returning id into member_id;
  else
    select * into me
    from public.members m
    where m.club_id = club
      and m.user_id = uid
      and m.is_junior = false
    limit 1;

    if me.id is not null and me.status = 'approved' then
      return jsonb_build_object('ok', false, 'error', 'already_member');
    end if;

    if me.id is not null then
      update public.members
      set display_name = inv.display_name,
          status = 'pending',
          invited_by = coalesce(creator_mid, invited_by)
      where id = me.id
      returning id into member_id;
    else
      insert into public.members (
        club_id, user_id, display_name, is_junior, status, invited_by
      ) values (
        club, uid, inv.display_name, false, 'pending', creator_mid
      )
      returning id into member_id;
    end if;
  end if;

  update public.invites
  set consumed_at = now()
  where id = inv.id;

  return jsonb_build_object(
    'ok', true,
    'member_id', member_id,
    'display_name', inv.display_name,
    'is_junior', inv.is_junior,
    'status', 'pending'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- admin: approve / deny, add / remove admins
-- ---------------------------------------------------------------------------

create or replace function public.set_member_status(p_member_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  club uuid;
  is_admin boolean;
  rec public.members%rowtype;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  if p_status not in ('pending', 'approved', 'denied') then
    return jsonb_build_object('ok', false, 'error', 'bad_status');
  end if;

  club := public.lake_club_id();
  select exists (
    select 1 from public.club_admins a where a.club_id = club and a.user_id = uid
  ) into is_admin;

  if not is_admin then
    return jsonb_build_object('ok', false, 'error', 'not_admin');
  end if;

  select * into rec from public.members where id = p_member_id and club_id = club;
  if rec.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  update public.members set status = p_status where id = rec.id;

  return jsonb_build_object('ok', true, 'id', rec.id, 'status', p_status);
end;
$$;

create or replace function public.add_club_admin(p_user_id uuid)
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

  club := public.lake_club_id();
  select exists (
    select 1 from public.club_admins a where a.club_id = club and a.user_id = uid
  ) into is_admin;

  if not is_admin then
    return jsonb_build_object('ok', false, 'error', 'not_admin');
  end if;

  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
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

  return jsonb_build_object('ok', true, 'user_id', p_user_id);
end;
$$;

create or replace function public.remove_club_admin(p_user_id uuid)
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

  club := public.lake_club_id();
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

  return jsonb_build_object('ok', true, 'user_id', p_user_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- execute grants (PostgREST)
-- ---------------------------------------------------------------------------

revoke all on function public.lake_club_id() from public, anon, authenticated;
revoke all on function public.lake_clean_name(text) from public, anon, authenticated;
revoke all on function public.claim_first_admin() from public, anon, authenticated;
revoke all on function public.my_club_state() from public, anon, authenticated;
revoke all on function public.lookup_invite(text) from public, anon, authenticated;
revoke all on function public.create_named_invite(text, boolean) from public, anon, authenticated;
revoke all on function public.consume_invite(text) from public, anon, authenticated;
revoke all on function public.set_member_status(uuid, text) from public, anon, authenticated;
revoke all on function public.add_club_admin(uuid) from public, anon, authenticated;
revoke all on function public.remove_club_admin(uuid) from public, anon, authenticated;

grant execute on function public.claim_first_admin() to authenticated;
grant execute on function public.my_club_state() to authenticated;
grant execute on function public.lookup_invite(text) to anon, authenticated;
grant execute on function public.create_named_invite(text, boolean) to authenticated;
grant execute on function public.consume_invite(text) to authenticated;
grant execute on function public.set_member_status(uuid, text) to authenticated;
grant execute on function public.add_club_admin(uuid) to authenticated;
grant execute on function public.remove_club_admin(uuid) to authenticated;

notify pgrst, 'reload schema';
