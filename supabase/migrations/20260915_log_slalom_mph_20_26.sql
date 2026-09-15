-- Match PR 27 UI speeds: allow 20–26 mph on hosted slalom logs.
-- Target: lake.world Supabase project zejficslgaqryxrndfqi only.
-- Apply in the lake.world Supabase SQL editor after JT skim + Joel says ship.
-- Widens both slalom_logs_mph_chk and log_slalom_set. Offs/buoys unchanged.

begin;

alter table public.slalom_logs drop constraint if exists slalom_logs_mph_chk;
alter table public.slalom_logs
  add constraint slalom_logs_mph_chk check (mph in (20, 22, 24, 26, 28, 30, 32, 34, 36));

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
  if p_off not in (15, 22, 28, 32) or p_mph not in (20, 22, 24, 26, 28, 30, 32, 34, 36)
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

revoke all on function public.log_slalom_set(uuid, uuid, integer, integer, numeric, uuid) from public, anon, authenticated;
grant execute on function public.log_slalom_set(uuid, uuid, integer, integer, numeric, uuid) to authenticated;

commit;
