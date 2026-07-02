-- ============================================================================
-- Better Tap — Admin CRM: roles, profiles, security (Supabase / Postgres)
-- Run this in Supabase → SQL Editor → New query → Run.
-- Safe to re-run (idempotent where possible).
-- ============================================================================

-- ---- Roles ------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('ceo','operations','customer_service_sales','installer');
exception when duplicate_object then null; end $$;

-- Field-service roles added to the enum (safe to re-run).
-- NOTE: run this file top-to-bottom. Policies below compare role via ::text so
-- newly-added enum values are never used as literals in the same transaction.
alter type public.app_role add value if not exists 'marketing';
alter type public.app_role add value if not exists 'sales';
alter type public.app_role add value if not exists 'customer_service';

-- ---- Profiles: one row per signed-in user, holds their role -----------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text unique not null,
  full_name   text,
  role        public.app_role not null default 'installer',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- ---- Helper functions (run with definer rights so RLS can call them) --------
create or replace function public.my_role() returns public.app_role
  language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_ceo() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'ceo')
$$;

-- ---- Auto-create a profile on signup; Jeffrey is CEO -----------------------
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    case when lower(new.email) = 'jeffrey@drinkbettertap.com'
         then 'ceo'::public.app_role
         else 'installer'::public.app_role end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---- Block role self-escalation: only the CEO can change a role ------------
create or replace function public.protect_role() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role) and not public.is_ceo() then
    raise exception 'Only the CEO can change roles';
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_role();

-- ---- RLS policies for profiles ---------------------------------------------
drop policy if exists "read own profile"   on public.profiles;
drop policy if exists "ceo reads all"       on public.profiles;
drop policy if exists "staff read profiles" on public.profiles;
drop policy if exists "update own profile"  on public.profiles;
drop policy if exists "ceo updates all"     on public.profiles;

-- Any signed-in staff member can read the team directory (names + roles).
-- This is needed so Operations/CS can show "assigned to" names and assign jobs.
-- It exposes only internal staff names/roles — no customer data lives here.
-- Changing a role is still CEO-only (enforced by the protect_role trigger below).
create policy "staff read profiles" on public.profiles for select using (auth.uid() is not null);
create policy "update own profile"  on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "ceo updates all"     on public.profiles for update using (public.is_ceo()) with check (public.is_ceo());

-- ============================================================================
-- Installations & Repairs jobs (real data for Morry + Ari)
-- ============================================================================
create table if not exists public.jobs (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null default 'installation' check (kind in ('installation','repair')),
  customer_name text,
  address       text,
  phone         text,
  scheduled_for timestamptz,
  status        text not null default 'scheduled' check (status in ('scheduled','in_progress','done','cancelled')),
  assigned_to   uuid references public.profiles(id) on delete set null,
  notes         text,
  created_at    timestamptz not null default now()
);
alter table public.jobs enable row level security;

drop policy if exists "installer sees own jobs"     on public.jobs;
drop policy if exists "ops/ceo/cs see all jobs"     on public.jobs;
drop policy if exists "ops/ceo manage jobs"         on public.jobs;
drop policy if exists "installer updates own job"   on public.jobs;

-- installers see only jobs assigned to them; ops/ceo/cs see all
create policy "installer sees own jobs"   on public.jobs for select using (assigned_to = auth.uid());
create policy "ops/ceo/cs see all jobs"   on public.jobs for select using (public.my_role() in ('ceo','operations','customer_service_sales'));
-- ops + ceo create / edit / delete jobs
create policy "ops/ceo manage jobs"       on public.jobs for all
  using (public.my_role() in ('ceo','operations')) with check (public.my_role() in ('ceo','operations'));
-- installers can update the status of their own job
create policy "installer updates own job" on public.jobs for update
  using (assigned_to = auth.uid()) with check (assigned_to = auth.uid());

-- ============================================================================
-- Done. Next: create the team accounts (they sign up at the CRM login),
-- then Jeffrey (CEO) assigns each person's role from the Team page.
-- Quick way to set roles directly (after the people have signed up):
--   update public.profiles set role='operations'            where email='doni@drinkbettertap.com';
--   update public.profiles set role='customer_service_sales' where email='ruchama@drinkbettertap.com';
--   update public.profiles set role='installer'             where email in ('morry@drinkbettertap.com','ari@drinkbettertap.com');
-- ============================================================================
