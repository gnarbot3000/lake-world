-- lake.world / Kneeboard club-shared trick photos
-- Project: zejficslgaqryxrndfqi (https://zejficslgaqryxrndfqi.supabase.co) ONLY
-- NEVER TurnKay zvjhpsvnipugsghqlqvw.
-- Run this WHOLE file in the lake.world SQL editor (Dashboard → SQL) after merge.
-- Do NOT run SQL from this agent and do NOT use a Supabase connector here.
--
-- Product:
--   Private Storage bucket kneeboard-photos (never public).
--   One photo metadata row per kneeboard_log (unique kneeboard_log_id).
--   Approved members of the same club can view (short signed URLs).
--   Cross-club, guest, pending, and denied cannot.
--   Uploader / authorized logger / parent can upload, replace, remove.
--   Other same-club approved members are view-only. Club admins may view.
--   Object path: <club_id>/<kneeboard_log_id>/<random>.webp
--   Authorization joins real log + metadata + membership — never trust path text alone.
--   club_recency kneeboard rows gain safe photo presence (id/path), not public URLs.
--
-- Static site uses the anon key + authenticated JWT only. Never service_role in client JS.

-- ---------------------------------------------------------------------------
-- private storage bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kneeboard-photos',
  'kneeboard-photos',
  false,
  15728640,
  array['image/webp', 'image/jpeg']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- metadata
-- ---------------------------------------------------------------------------

create table if not exists public.kneeboard_log_photos (
  id uuid primary key default gen_random_uuid(),
  kneeboard_log_id uuid not null unique references public.kneeboard_logs (id) on delete cascade,
  club_id uuid not null references public.clubs (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  object_path text not null unique,
  uploaded_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kneeboard_log_photos_path_chk check (
    char_length(object_path) between 20 and 240
    and object_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|jpeg)$'
  )
);

create index if not exists kneeboard_log_photos_club_idx
  on public.kneeboard_log_photos (club_id, updated_at desc);

create index if not exists kneeboard_log_photos_member_idx
  on public.kneeboard_log_photos (member_id, updated_at desc);

alter table public.kneeboard_log_photos enable row level security;

revoke all on table public.kneeboard_log_photos from anon, authenticated, public;

drop policy if exists kneeboard_log_photos_select_same_club on public.kneeboard_log_photos;
create policy kneeboard_log_photos_select_same_club
  on public.kneeboard_log_photos
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.members m
      where m.user_id = auth.uid()
        and m.club_id = kneeboard_log_photos.club_id
        and m.is_junior = false
        and m.status = 'approved'
    )
    or exists (
      select 1
      from public.club_admins a
      where a.user_id = auth.uid()
        and a.club_id = kneeboard_log_photos.club_id
    )
  );

grant select on table public.kneeboard_log_photos to authenticated;

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

create or replace function public.lake_is_club_admin(p_club_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or p_club_id is null then
    return false;
  end if;
  return exists (
    select 1 from public.club_admins a
    where a.club_id = p_club_id and a.user_id = uid
  );
end;
$$;

create or replace function public.lake_is_approved_in_club(p_club_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or p_club_id is null then
    return false;
  end if;
  return exists (
    select 1
    from public.members m
    where m.club_id = p_club_id
      and m.user_id = uid
      and m.is_junior = false
      and m.status = 'approved'
  ) or public.lake_is_club_admin(p_club_id);
end;
$$;

create or replace function public.lake_can_edit_kneeboard_photo(p_log_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  log_rec public.kneeboard_logs%rowtype;
begin
  if p_log_id is null then
    return false;
  end if;
  select * into log_rec from public.kneeboard_logs where id = p_log_id limit 1;
  if log_rec.id is null then
    return false;
  end if;
  return public.lake_can_write_member(log_rec.member_id);
end;
$$;

create or replace function public.lake_photo_path_matches(p_club_id uuid, p_log_id uuid, p_object_path text)
returns boolean
language plpgsql
immutable
as $$
begin
  if p_club_id is null or p_log_id is null or p_object_path is null then
    return false;
  end if;
  return p_object_path ~ (
    '^' || p_club_id::text || '/' || p_log_id::text ||
    '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|jpeg)$'
  );
end;
$$;

create or replace function public.lake_delete_storage_object(p_bucket text, p_path text)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  if p_bucket is null or p_path is null or btrim(p_path) = '' then
    return;
  end if;
  delete from storage.objects
  where bucket_id = p_bucket
    and name = p_path;
end;
$$;

-- ---------------------------------------------------------------------------
-- storage.objects RLS (private bucket; authorize via log + membership)
-- ---------------------------------------------------------------------------

drop policy if exists kneeboard_photos_select on storage.objects;
create policy kneeboard_photos_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'kneeboard-photos'
    and exists (
      select 1
      from public.kneeboard_log_photos p
      where p.object_path = name
        and public.lake_is_approved_in_club(p.club_id)
    )
  );

drop policy if exists kneeboard_photos_insert on storage.objects;
create policy kneeboard_photos_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'kneeboard-photos'
    and exists (
      select 1
      from public.kneeboard_logs k
      where k.id = nullif(split_part(name, '/', 2), '')::uuid
        and k.club_id = nullif(split_part(name, '/', 1), '')::uuid
        and public.lake_can_write_member(k.member_id)
        and public.lake_photo_path_matches(k.club_id, k.id, name)
    )
  );

drop policy if exists kneeboard_photos_update on storage.objects;
create policy kneeboard_photos_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'kneeboard-photos'
    and exists (
      select 1
      from public.kneeboard_logs k
      where k.id = nullif(split_part(name, '/', 2), '')::uuid
        and k.club_id = nullif(split_part(name, '/', 1), '')::uuid
        and public.lake_can_write_member(k.member_id)
    )
  )
  with check (
    bucket_id = 'kneeboard-photos'
    and exists (
      select 1
      from public.kneeboard_logs k
      where k.id = nullif(split_part(name, '/', 2), '')::uuid
        and k.club_id = nullif(split_part(name, '/', 1), '')::uuid
        and public.lake_can_write_member(k.member_id)
        and public.lake_photo_path_matches(k.club_id, k.id, name)
    )
  );

drop policy if exists kneeboard_photos_delete on storage.objects;
create policy kneeboard_photos_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'kneeboard-photos'
    and (
      exists (
        select 1
        from public.kneeboard_logs k
        where k.id = nullif(split_part(name, '/', 2), '')::uuid
          and k.club_id = nullif(split_part(name, '/', 1), '')::uuid
          and public.lake_can_write_member(k.member_id)
      )
      or exists (
        select 1
        from public.kneeboard_log_photos p
        where p.object_path = name
          and public.lake_can_write_member(p.member_id)
      )
    )
  );

-- ---------------------------------------------------------------------------
-- prepare / register / view / remove RPCs
-- ---------------------------------------------------------------------------

create or replace function public.prepare_kneeboard_photo(p_kneeboard_log_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  log_rec public.kneeboard_logs%rowtype;
  object_path text;
  ext text := 'webp';
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;
  if p_kneeboard_log_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into log_rec from public.kneeboard_logs where id = p_kneeboard_log_id limit 1;
  if log_rec.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if not public.lake_can_write_member(log_rec.member_id) then
    return jsonb_build_object('ok', false, 'error', 'not_your_log');
  end if;

  object_path := log_rec.club_id::text || '/' || log_rec.id::text || '/' || gen_random_uuid()::text || '.' || ext;

  return jsonb_build_object(
    'ok', true,
    'kneeboard_log_id', log_rec.id,
    'club_id', log_rec.club_id,
    'member_id', log_rec.member_id,
    'object_path', object_path,
    'content_type', 'image/webp',
    'bucket', 'kneeboard-photos'
  );
end;
$$;

create or replace function public.register_kneeboard_photo(
  p_kneeboard_log_id uuid,
  p_object_path text,
  p_content_type text default 'image/webp'
)
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  uid uuid := auth.uid();
  log_rec public.kneeboard_logs%rowtype;
  old_path text;
  photo_id uuid;
  clean_path text;
  ctype text;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  select * into log_rec from public.kneeboard_logs where id = p_kneeboard_log_id limit 1;
  if log_rec.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if not public.lake_can_write_member(log_rec.member_id) then
    return jsonb_build_object('ok', false, 'error', 'not_your_log');
  end if;

  clean_path := nullif(btrim(coalesce(p_object_path, '')), '');
  if clean_path is null
     or not public.lake_photo_path_matches(log_rec.club_id, log_rec.id, clean_path) then
    return jsonb_build_object('ok', false, 'error', 'bad_path');
  end if;

  ctype := lower(coalesce(nullif(btrim(p_content_type), ''), 'image/webp'));
  if ctype not in ('image/webp', 'image/jpeg', 'image/jpg') then
    return jsonb_build_object('ok', false, 'error', 'bad_type');
  end if;

  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'kneeboard-photos' and o.name = clean_path
  ) then
    return jsonb_build_object('ok', false, 'error', 'missing_object');
  end if;

  select p.object_path, p.id into old_path, photo_id
  from public.kneeboard_log_photos p
  where p.kneeboard_log_id = log_rec.id
  limit 1;

  if photo_id is null then
    insert into public.kneeboard_log_photos (
      kneeboard_log_id, club_id, member_id, object_path, uploaded_by
    ) values (
      log_rec.id, log_rec.club_id, log_rec.member_id, clean_path, uid
    )
    returning id into photo_id;
  else
    update public.kneeboard_log_photos
    set object_path = clean_path,
        uploaded_by = uid,
        member_id = log_rec.member_id,
        club_id = log_rec.club_id,
        updated_at = now()
    where id = photo_id;
    if old_path is not null and old_path <> clean_path then
      perform public.lake_delete_storage_object('kneeboard-photos', old_path);
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', photo_id,
    'kneeboard_log_id', log_rec.id,
    'club_id', log_rec.club_id,
    'member_id', log_rec.member_id,
    'object_path', clean_path,
    'can_edit', true
  );
end;
$$;

create or replace function public.view_kneeboard_photo(p_kneeboard_log_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  log_rec public.kneeboard_logs%rowtype;
  photo public.kneeboard_log_photos%rowtype;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  select * into log_rec from public.kneeboard_logs where id = p_kneeboard_log_id limit 1;
  if log_rec.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if not public.lake_is_approved_in_club(log_rec.club_id) then
    return jsonb_build_object('ok', false, 'error', 'not_a_member');
  end if;

  select * into photo
  from public.kneeboard_log_photos p
  where p.kneeboard_log_id = log_rec.id
  limit 1;

  if photo.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', photo.id,
    'kneeboard_log_id', photo.kneeboard_log_id,
    'club_id', photo.club_id,
    'member_id', photo.member_id,
    'object_path', photo.object_path,
    'bucket', 'kneeboard-photos',
    'can_edit', public.lake_can_edit_kneeboard_photo(log_rec.id)
  );
end;
$$;

create or replace function public.remove_kneeboard_photo(p_kneeboard_log_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  uid uuid := auth.uid();
  log_rec public.kneeboard_logs%rowtype;
  photo public.kneeboard_log_photos%rowtype;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  select * into log_rec from public.kneeboard_logs where id = p_kneeboard_log_id limit 1;
  if log_rec.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if not public.lake_can_write_member(log_rec.member_id) then
    return jsonb_build_object('ok', false, 'error', 'not_your_log');
  end if;

  select * into photo
  from public.kneeboard_log_photos p
  where p.kneeboard_log_id = log_rec.id
  limit 1;

  if photo.id is null then
    return jsonb_build_object('ok', true, 'removed', false);
  end if;

  delete from public.kneeboard_log_photos where id = photo.id;
  perform public.lake_delete_storage_object('kneeboard-photos', photo.object_path);

  return jsonb_build_object('ok', true, 'removed', true, 'id', photo.id);
end;
$$;

create or replace function public.rollback_kneeboard_photo_upload(p_object_path text)
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  uid uuid := auth.uid();
  club_part uuid;
  log_part uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;
  begin
    club_part := nullif(split_part(p_object_path, '/', 1), '')::uuid;
    log_part := nullif(split_part(p_object_path, '/', 2), '')::uuid;
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'bad_path');
  end;
  if club_part is null or log_part is null
     or not public.lake_photo_path_matches(club_part, log_part, p_object_path) then
    return jsonb_build_object('ok', false, 'error', 'bad_path');
  end if;
  if not public.lake_can_edit_kneeboard_photo(log_part) then
    return jsonb_build_object('ok', false, 'error', 'not_your_log');
  end if;
  -- Only roll back unregistered orphans (never delete a registered object_path).
  if exists (
    select 1 from public.kneeboard_log_photos p where p.object_path = p_object_path
  ) then
    return jsonb_build_object('ok', false, 'error', 'registered');
  end if;
  perform public.lake_delete_storage_object('kneeboard-photos', p_object_path);
  return jsonb_build_object('ok', true, 'rolled_back', true);
end;
$$;

create or replace function public.kneeboard_photos_for_logs(p_ids uuid[])
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rows jsonb;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;
  if p_ids is null or coalesce(array_length(p_ids, 1), 0) = 0 then
    return jsonb_build_object('ok', true, 'photos', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'kneeboard_log_id', p.kneeboard_log_id,
    'club_id', p.club_id,
    'member_id', p.member_id,
    'object_path', p.object_path,
    'can_edit', public.lake_can_edit_kneeboard_photo(p.kneeboard_log_id)
  ) order by p.updated_at desc), '[]'::jsonb)
  into rows
  from public.kneeboard_log_photos p
  where p.kneeboard_log_id = any(p_ids)
    and public.lake_is_approved_in_club(p.club_id);

  return jsonb_build_object('ok', true, 'photos', rows);
end;
$$;

-- ---------------------------------------------------------------------------
-- wrap club_recency: add safe photo presence on kneeboard rows
-- ---------------------------------------------------------------------------

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
        ), '[]'::jsonb),
        'has_photo', case
          when x.kind = 'kneeboard' then exists (
            select 1 from public.kneeboard_log_photos ph
            where ph.kneeboard_log_id = x.id
          )
          else false
        end,
        'photo_id', case
          when x.kind = 'kneeboard' then (
            select ph.id from public.kneeboard_log_photos ph
            where ph.kneeboard_log_id = x.id
            limit 1
          )
          else null
        end,
        'photo_path', case
          when x.kind = 'kneeboard' then (
            select ph.object_path from public.kneeboard_log_photos ph
            where ph.kneeboard_log_id = x.id
            limit 1
          )
          else null
        end
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

-- ---------------------------------------------------------------------------
-- grants
-- ---------------------------------------------------------------------------

revoke all on function public.lake_is_club_admin(uuid) from public, anon, authenticated;
revoke all on function public.lake_is_approved_in_club(uuid) from public, anon, authenticated;
revoke all on function public.lake_can_edit_kneeboard_photo(uuid) from public, anon, authenticated;
revoke all on function public.lake_photo_path_matches(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.lake_delete_storage_object(text, text) from public, anon, authenticated;
revoke all on function public.prepare_kneeboard_photo(uuid) from public, anon, authenticated;
revoke all on function public.register_kneeboard_photo(uuid, text, text) from public, anon, authenticated;
revoke all on function public.view_kneeboard_photo(uuid) from public, anon, authenticated;
revoke all on function public.remove_kneeboard_photo(uuid) from public, anon, authenticated;
revoke all on function public.rollback_kneeboard_photo_upload(text) from public, anon, authenticated;
revoke all on function public.kneeboard_photos_for_logs(uuid[]) from public, anon, authenticated;
revoke all on function public.club_recency(integer, uuid) from public, anon, authenticated;

grant execute on function public.prepare_kneeboard_photo(uuid) to authenticated;
grant execute on function public.register_kneeboard_photo(uuid, text, text) to authenticated;
grant execute on function public.view_kneeboard_photo(uuid) to authenticated;
grant execute on function public.remove_kneeboard_photo(uuid) to authenticated;
grant execute on function public.rollback_kneeboard_photo_upload(text) to authenticated;
grant execute on function public.kneeboard_photos_for_logs(uuid[]) to authenticated;
grant execute on function public.club_recency(integer, uuid) to authenticated;

notify pgrst, 'reload schema';
