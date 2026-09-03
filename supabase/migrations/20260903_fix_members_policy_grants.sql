-- Fix: authenticated RLS policies must not SELECT public.members / club_admins
-- directly (those tables revoke all from authenticated). Photo upload failed with
-- "permission denied for table members" because storage.objects INSERT selects
-- kneeboard_logs, whose SELECT policy queried members as the invoker.
-- Also grant execute on lake_is_approved_in_club so storage SELECT policies can call it.

create or replace function public.lake_member_club_id(p_member_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cid uuid;
begin
  if p_member_id is null then
    return null;
  end if;
  select m.club_id into cid from public.members m where m.id = p_member_id limit 1;
  return cid;
end;
$$;

create or replace function public.lake_storage_can_write_kneeboard_photo(p_object_path text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  club_part uuid;
  log_part uuid;
  log_rec public.kneeboard_logs%rowtype;
begin
  if p_object_path is null or btrim(p_object_path) = '' then
    return false;
  end if;
  begin
    club_part := nullif(split_part(p_object_path, '/', 1), '')::uuid;
    log_part := nullif(split_part(p_object_path, '/', 2), '')::uuid;
  exception when others then
    return false;
  end;
  if club_part is null or log_part is null then
    return false;
  end if;
  select * into log_rec
  from public.kneeboard_logs k
  where k.id = log_part and k.club_id = club_part
  limit 1;
  if log_rec.id is null then
    return false;
  end if;
  if not public.lake_can_write_member(log_rec.member_id) then
    return false;
  end if;
  return public.lake_photo_path_matches(log_rec.club_id, log_rec.id, p_object_path);
end;
$$;

create or replace function public.lake_storage_can_delete_kneeboard_photo(p_object_path text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  club_part uuid;
  log_part uuid;
  log_rec public.kneeboard_logs%rowtype;
begin
  if p_object_path is null or btrim(p_object_path) = '' then
    return false;
  end if;
  begin
    club_part := nullif(split_part(p_object_path, '/', 1), '')::uuid;
    log_part := nullif(split_part(p_object_path, '/', 2), '')::uuid;
  exception when others then
    return false;
  end;
  if log_part is not null and club_part is not null then
    select * into log_rec
    from public.kneeboard_logs k
    where k.id = log_part and k.club_id = club_part
    limit 1;
    if log_rec.id is not null and public.lake_can_write_member(log_rec.member_id) then
      return true;
    end if;
  end if;
  return exists (
    select 1
    from public.kneeboard_log_photos p
    where p.object_path = p_object_path
      and public.lake_can_write_member(p.member_id)
  );
end;
$$;

revoke all on function public.lake_member_club_id(uuid) from public, anon, authenticated;
revoke all on function public.lake_storage_can_write_kneeboard_photo(text) from public, anon, authenticated;
revoke all on function public.lake_storage_can_delete_kneeboard_photo(text) from public, anon, authenticated;
revoke all on function public.lake_is_approved_in_club(uuid) from public, anon, authenticated;

grant execute on function public.lake_member_club_id(uuid) to authenticated;
grant execute on function public.lake_storage_can_write_kneeboard_photo(text) to authenticated;
grant execute on function public.lake_storage_can_delete_kneeboard_photo(text) to authenticated;
grant execute on function public.lake_is_approved_in_club(uuid) to authenticated;

-- public log SELECT policies: no raw members
drop policy if exists slalom_logs_select_approved on public.slalom_logs;
create policy slalom_logs_select_approved
  on public.slalom_logs
  for select
  to authenticated
  using (public.lake_is_approved_in_club(club_id));

drop policy if exists kneeboard_logs_select_approved on public.kneeboard_logs;
create policy kneeboard_logs_select_approved
  on public.kneeboard_logs
  for select
  to authenticated
  using (public.lake_is_approved_in_club(club_id));

drop policy if exists slalom_logs_insert_own on public.slalom_logs;
create policy slalom_logs_insert_own
  on public.slalom_logs
  for insert
  to authenticated
  with check (
    public.lake_can_write_member(member_id)
    and created_by = auth.uid()
    and club_id = public.lake_member_club_id(member_id)
  );

drop policy if exists kneeboard_logs_insert_own on public.kneeboard_logs;
create policy kneeboard_logs_insert_own
  on public.kneeboard_logs
  for insert
  to authenticated
  with check (
    public.lake_can_write_member(member_id)
    and created_by = auth.uid()
    and club_id = public.lake_member_club_id(member_id)
  );

drop policy if exists kneeboard_log_photos_select_same_club on public.kneeboard_log_photos;
create policy kneeboard_log_photos_select_same_club
  on public.kneeboard_log_photos
  for select
  to authenticated
  using (public.lake_is_approved_in_club(club_id));

-- storage.objects: fully definer-backed checks (no nested invoker RLS on logs)
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
    and public.lake_storage_can_write_kneeboard_photo(name)
  );

drop policy if exists kneeboard_photos_update on storage.objects;
create policy kneeboard_photos_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'kneeboard-photos'
    and public.lake_storage_can_write_kneeboard_photo(name)
  )
  with check (
    bucket_id = 'kneeboard-photos'
    and public.lake_storage_can_write_kneeboard_photo(name)
  );

drop policy if exists kneeboard_photos_delete on storage.objects;
create policy kneeboard_photos_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'kneeboard-photos'
    and public.lake_storage_can_delete_kneeboard_photo(name)
  );
