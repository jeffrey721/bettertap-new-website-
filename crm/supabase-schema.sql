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
-- FIELD-SERVICE EXTENSION — customers, machines, orders, cases, interactions,
-- tasks, parts, campaigns (+ extended jobs). Role-based RLS.
-- Policies compare role via ::text so newly-added enum values are safe.
-- ============================================================================

-- ---- role helpers -----------------------------------------------------------
create or replace function public.is_staff() returns boolean
  language sql stable security definer set search_path=public as $$
  select public.my_role()::text in ('ceo','operations','customer_service','customer_service_sales','sales','marketing') $$;

create or replace function public.is_office() returns boolean  -- may see financials
  language sql stable security definer set search_path=public as $$
  select public.my_role()::text in ('ceo','operations','customer_service','customer_service_sales','sales') $$;

-- ---- extend jobs ------------------------------------------------------------
alter table public.jobs
  add column if not exists customer_id       uuid,
  add column if not exists machine_id        uuid,
  add column if not exists priority          text default 'P3_normal',
  add column if not exists time_window       text,
  add column if not exists route_order       int,
  add column if not exists color             text,
  add column if not exists special_notes     text,
  add column if not exists items_to_bring    jsonb default '[]'::jsonb,
  add column if not exists amount_to_collect numeric default 0,
  add column if not exists amount_collected  numeric default 0,
  add column if not exists parts_used        jsonb default '[]'::jsonb,
  add column if not exists duration_min      int,
  add column if not exists checklist         jsonb default '[]'::jsonb,
  add column if not exists photos            jsonb default '[]'::jsonb,
  add column if not exists signature         text,
  add column if not exists sla_due           timestamptz,
  add column if not exists source_case_id    uuid;
alter table public.jobs drop constraint if exists jobs_kind_check;
alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_kind_check   check (kind in ('installation','repair','filter_replacement','uv_replacement','maintenance','removal'));
alter table public.jobs add constraint jobs_status_check check (status in ('unscheduled','scheduled','en_route','in_progress','done','cancelled'));
drop policy if exists "office see all jobs" on public.jobs;
create policy "office see all jobs" on public.jobs for select using (public.is_office());

-- ---- customers --------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null, emails jsonb default '[]'::jsonb, phones jsonb default '[]'::jsonb,
  install_address text, billing_address text,
  type text default 'prospect' check (type in ('prospect','customer')),
  lead_source text, utm_campaign text, status text, tags jsonb default '[]'::jsonb,
  owner_id uuid references public.profiles(id) on delete set null,
  marketing_opt_in boolean default false, notes text,
  created_at timestamptz not null default now()
);
alter table public.customers enable row level security;
drop policy if exists "staff read customers" on public.customers;
drop policy if exists "office manage customers" on public.customers;
create policy "staff read customers"   on public.customers for select using (public.is_staff());
create policy "office manage customers" on public.customers for all using (public.is_office()) with check (public.is_office());

-- ---- machines (installed assets) -------------------------------------------
create table if not exists public.machines (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  model text default 'Water Bar WDC-E-032 Edge', color text check (color in ('white','black')),
  serial_number text, install_date timestamptz, warranty_until timestamptz,
  filter_last_replaced timestamptz, filter_due timestamptz,
  uv_last_replaced timestamptz, uv_due timestamptz,
  location_in_home text, ownership text default 'owned' check (ownership in ('owned','lease')),
  status text default 'active' check (status in ('active','removed')), notes text,
  created_at timestamptz not null default now()
);
alter table public.machines enable row level security;
drop policy if exists "read machines" on public.machines;
drop policy if exists "office manage machines" on public.machines;
drop policy if exists "installer add machines" on public.machines;
create policy "read machines"          on public.machines for select using (public.is_staff() or public.my_role()::text='installer');
create policy "office manage machines" on public.machines for all using (public.is_office()) with check (public.is_office());
create policy "installer add machines" on public.machines for insert with check (public.my_role()::text='installer');

-- ---- orders (financial) -----------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  plan text check (plan in ('cash_1280','installments','lease')),
  amount_total numeric default 0, amount_paid numeric default 0, balance numeric default 0,
  payment_status text, payment_method text, color_requested text, special_notes text,
  stage text default 'lead' check (stage in ('lead','qualified','quote','won','installed','lost')),
  rep_id uuid references public.profiles(id) on delete set null,
  shopify_order_id text, order_date timestamptz default now(),
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;
drop policy if exists "office read orders" on public.orders;
drop policy if exists "office manage orders" on public.orders;
create policy "office read orders"   on public.orders for select using (public.is_office());  -- marketing excluded from financials
create policy "office manage orders" on public.orders for all using (public.is_office()) with check (public.is_office());

-- ---- cases ------------------------------------------------------------------
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  machine_id uuid references public.machines(id) on delete set null,
  channel text, direction text, subject text, category text,
  priority text default 'P3_normal', status text default 'open' check (status in ('open','pending','resolved','closed')),
  assigned_to uuid references public.profiles(id) on delete set null,
  opened_at timestamptz default now(), resolved_at timestamptz, sla_due timestamptz,
  resolution text, resolution_type text, linked_job_id uuid, ts_path jsonb default '[]'::jsonb, notes text,
  created_at timestamptz not null default now()
);
alter table public.cases enable row level security;
drop policy if exists "staff read cases" on public.cases;
drop policy if exists "office manage cases" on public.cases;
create policy "staff read cases"   on public.cases for select using (public.is_staff());
create policy "office manage cases" on public.cases for all using (public.is_office()) with check (public.is_office());

-- ---- interactions -----------------------------------------------------------
create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  type text, direction text, agent_id uuid references public.profiles(id) on delete set null,
  "timestamp" timestamptz default now(), duration_sec int, subject text, body text, outcome text,
  created_at timestamptz not null default now()
);
alter table public.interactions enable row level security;
drop policy if exists "office interactions" on public.interactions;
create policy "office interactions" on public.interactions for all using (public.is_office()) with check (public.is_office());

-- ---- tasks ------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  related_type text, related_id uuid, title text, due_date timestamptz,
  assignee_id uuid references public.profiles(id) on delete set null,
  status text default 'open', auto_key text,
  created_at timestamptz not null default now()
);
alter table public.tasks enable row level security;
drop policy if exists "staff read tasks" on public.tasks;
drop policy if exists "office manage tasks" on public.tasks;
create policy "staff read tasks"   on public.tasks for select using (public.is_staff());
create policy "office manage tasks" on public.tasks for all using (public.is_office()) with check (public.is_office());

-- ---- parts (inventory) ------------------------------------------------------
create table if not exists public.parts (
  id uuid primary key default gen_random_uuid(),
  sku text, name text, qty_on_hand int default 0, reorder_level int default 0,
  cost numeric default 0, price numeric default 0, location text,
  created_at timestamptz not null default now()
);
alter table public.parts enable row level security;
drop policy if exists "staff read parts" on public.parts;
drop policy if exists "ops manage parts" on public.parts;
create policy "staff read parts" on public.parts for select using (public.is_staff() or public.my_role()::text='installer');
create policy "ops manage parts" on public.parts for all using (public.my_role()::text in ('ceo','operations')) with check (public.my_role()::text in ('ceo','operations'));

-- ---- campaigns (marketing) --------------------------------------------------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text, channel text, spend numeric default 0, leads int default 0, conversions int default 0,
  start timestamptz, "end" timestamptz,
  created_at timestamptz not null default now()
);
alter table public.campaigns enable row level security;
drop policy if exists "staff read campaigns" on public.campaigns;
drop policy if exists "mkt manage campaigns" on public.campaigns;
create policy "staff read campaigns" on public.campaigns for select using (public.is_staff());
create policy "mkt manage campaigns" on public.campaigns for all using (public.my_role()::text in ('ceo','marketing')) with check (public.my_role()::text in ('ceo','marketing'));

-- ============================================================================
-- Done. Team signs up at the CRM login; CEO assigns roles on the Team page.
-- Set roles directly (after signup):
--   update public.profiles set role='sales'            where email='noa@drinkbettertap.com';
--   update public.profiles set role='marketing'        where email='tali@drinkbettertap.com';
--   update public.profiles set role='operations'       where email='eli@drinkbettertap.com';
--   update public.profiles set role='customer_service' where email='dana.cs@drinkbettertap.com';
--   update public.profiles set role='installer'        where email in ('morry@drinkbettertap.com','ari@drinkbettertap.com');
-- ============================================================================
