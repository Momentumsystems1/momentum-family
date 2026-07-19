-- Momentum Family: first secure relational model.
-- Run in a new Supabase project via SQL Editor or Supabase CLI.

create extension if not exists pgcrypto;

create type public.family_role as enum ('admin', 'adult', 'member');
create type public.activity_state as enum ('walking', 'running', 'driving', 'stopped', 'offline');
create type public.alert_type as enum ('sos', 'check_in', 'arrival', 'departure', 'fall', 'anomaly', 'v16', 'battery', 'offline');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.family_role not null default 'member',
  location_sharing boolean not null default false,
  can_receive_safety_alerts boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  friendly_name text not null,
  platform text check (platform in ('ios', 'android', 'web')),
  push_token text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.locations (
  id bigint generated always as identity primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m double precision,
  speed_mps double precision,
  heading_degrees double precision,
  activity public.activity_state not null default 'stopped',
  battery_percent smallint check (battery_percent between 0 and 100),
  captured_at timestamptz not null default now()
);

create index locations_family_captured_idx on public.locations(family_id, captured_at desc);
create index locations_user_captured_idx on public.locations(user_id, captured_at desc);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  target_user_id uuid references public.profiles(id),
  type public.alert_type not null,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'closed')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz
);

create or replace function public.is_family_member(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_id = target_family_id and fm.user_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.devices enable row level security;
alter table public.locations enable row level security;
alter table public.alerts enable row level security;

create policy profiles_select_family on public.profiles
for select to authenticated
using (
  id = auth.uid() or exists (
    select 1
    from public.family_members mine
    join public.family_members theirs on theirs.family_id = mine.family_id
    where mine.user_id = auth.uid() and theirs.user_id = profiles.id
  )
);

create policy profiles_update_self on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy families_select_member on public.families
for select to authenticated using (public.is_family_member(id));

create policy families_insert_creator on public.families
for insert to authenticated with check (created_by = auth.uid());

create policy family_members_select_member on public.family_members
for select to authenticated using (public.is_family_member(family_id));

create policy devices_select_family on public.devices
for select to authenticated using (public.is_family_member(family_id));

create policy devices_manage_own on public.devices
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy locations_select_consented_family on public.locations
for select to authenticated
using (
  public.is_family_member(family_id)
  and exists (
    select 1 from public.family_members owner
    where owner.family_id = locations.family_id
      and owner.user_id = locations.user_id
      and owner.location_sharing = true
  )
);

create policy locations_insert_own on public.locations
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_family_member(family_id)
  and exists (
    select 1 from public.family_members mine
    where mine.family_id = locations.family_id
      and mine.user_id = auth.uid()
      and mine.location_sharing = true
  )
);

create policy alerts_select_family on public.alerts
for select to authenticated using (public.is_family_member(family_id));

create policy alerts_insert_member on public.alerts
for insert to authenticated
with check (created_by = auth.uid() and public.is_family_member(family_id));
