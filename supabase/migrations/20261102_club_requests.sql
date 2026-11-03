-- lake.world /for-clubs: "Request a club board" form store.
-- Target: lake.world Supabase project zejficslgaqryxrndfqi ONLY
-- (https://zejficslgaqryxrndfqi.supabase.co). NEVER TurnKay zvjhpsvnipugsghqlqvw.
-- NEEDS APPROVAL BEFORE APPLYING: new table. Paste into the lake.world SQL
-- editor in one go only after Joel OKs it. After it is applied, set
-- window.LAKE_CLUB_REQUESTS_LIVE = true in js/config.js so the form saves.
--
-- Access model:
--   anon/authenticated may INSERT only the form columns (column grants + RLS
--   WITH CHECK). No SELECT/UPDATE/DELETE grant and no select policy, so the
--   public can never read requests back. Joel reads rows in the dashboard.
--   A BEFORE INSERT trigger silently drops honeypot rows, trims text, and
--   rate-limits (per email, per hashed client IP, and a global cap).
--   No email is sent by anything here.

begin;

create table if not exists public.club_requests (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  club_name     text not null,
  contact_email text not null,
  contact_role  text not null,
  club_type     text not null,
  member_count  text not null,
  sports        text[] not null default '{}',
  country       text,
  notes         text,
  website       text,            -- honeypot; always null in stored rows
  ip_hash       text,            -- md5(salt || client ip), for rate limiting only
  status        text not null default 'new',
  constraint club_requests_name_chk    check (char_length(club_name) between 2 and 100),
  constraint club_requests_email_chk   check (char_length(contact_email) between 6 and 254
                                              and contact_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint club_requests_role_chk    check (contact_role in ('admin', 'coach', 'member', 'other')),
  constraint club_requests_type_chk    check (club_type in ('water_ski_club', 'ski_school', 'tournament_site', 'private_lake', 'other')),
  constraint club_requests_count_chk   check (member_count in ('1-10', '11-25', '26-50', '51-100', '100+')),
  constraint club_requests_sports_chk  check (cardinality(sports) <= 7
                                              and sports <@ array['slalom', 'trick', 'jump', 'kneeboard', 'wakeboard', 'barefoot', 'other']::text[]),
  constraint club_requests_country_chk check (country is null or country in ('US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'DE', 'FR', 'IT', 'ES', 'NL', 'other')),
  constraint club_requests_notes_chk   check (notes is null or char_length(notes) <= 500),
  constraint club_requests_hp_chk      check (website is null),
  constraint club_requests_status_chk  check (status in ('new', 'contacted', 'set_up', 'declined'))
);

create index if not exists club_requests_created_idx on public.club_requests (created_at desc);
create index if not exists club_requests_email_idx   on public.club_requests (lower(contact_email), created_at desc);
create index if not exists club_requests_ip_idx      on public.club_requests (ip_hash, created_at desc);

create or replace function public.club_requests_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hdrs json;
  ip text;
begin
  -- Honeypot: a filled hidden field means a bot. Drop the row silently.
  if coalesce(btrim(new.website), '') <> '' then
    return null;
  end if;
  new.website := null;

  -- Server-owned columns: never trust client values.
  new.id := gen_random_uuid();
  new.created_at := now();
  new.status := 'new';

  new.club_name := btrim(new.club_name);
  new.contact_email := lower(btrim(new.contact_email));
  new.notes := nullif(btrim(coalesce(new.notes, '')), '');
  new.country := nullif(new.country, '');
  select coalesce(array_agg(distinct s), '{}') into new.sports from unnest(new.sports) s;

  begin
    hdrs := current_setting('request.headers', true)::json;
  exception when others then
    hdrs := null;
  end;
  ip := split_part(coalesce(hdrs ->> 'cf-connecting-ip', hdrs ->> 'x-forwarded-for', ''), ',', 1);
  new.ip_hash := case when btrim(ip) = '' then null
                      else md5('lake.world/club_requests:' || btrim(ip)) end;

  -- Rate limits (simple; raise -> PostgREST 4xx -> the page shows its fallback).
  if (select count(*) from public.club_requests
       where created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if (select count(*) from public.club_requests
       where lower(contact_email) = new.contact_email
         and created_at > now() - interval '1 day') >= 3 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if new.ip_hash is not null and (select count(*) from public.club_requests
       where ip_hash = new.ip_hash
         and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.club_requests_before_insert() from public, anon, authenticated;

drop trigger if exists club_requests_before_insert on public.club_requests;
create trigger club_requests_before_insert
  before insert on public.club_requests
  for each row execute function public.club_requests_before_insert();

alter table public.club_requests enable row level security;

revoke all on table public.club_requests from public, anon, authenticated;
grant insert (club_name, contact_email, contact_role, club_type, member_count,
              sports, country, notes, website)
  on table public.club_requests to anon, authenticated;

drop policy if exists club_requests_insert_public on public.club_requests;
create policy club_requests_insert_public
  on public.club_requests
  for insert
  to anon, authenticated
  with check (
    status = 'new'
    and website is null
    and char_length(club_name) between 2 and 100
    and char_length(contact_email) between 6 and 254
    and contact_role in ('admin', 'coach', 'member', 'other')
    and club_type in ('water_ski_club', 'ski_school', 'tournament_site', 'private_lake', 'other')
    and member_count in ('1-10', '11-25', '26-50', '51-100', '100+')
    and cardinality(sports) <= 7
    and (notes is null or char_length(notes) <= 500)
  );
-- Intentionally no SELECT / UPDATE / DELETE policy for anon or authenticated.

commit;
