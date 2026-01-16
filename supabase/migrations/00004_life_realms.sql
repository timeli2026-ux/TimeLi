-- Life Realms and Goals tables for TimeLi
-- Phase 4: Onboarding Flow - Plan 03
-- Enables users to organize goals under life areas/realms

-- =============================================================================
-- LIFE_REALMS TABLE
-- =============================================================================
-- Stores user's life realms (areas of life they want to balance)
-- Examples: Health, Career, Relationships, Personal Growth, etc.

create table public.life_realms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,

  -- Realm details
  name text not null,
  icon text, -- Emoji icon (optional)
  is_custom boolean default false, -- Whether user created this or selected from suggestions

  -- Order for display
  display_order integer default 0,

  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Ensure unique realm names per user
  unique(user_id, name)
);

-- =============================================================================
-- USER_GOALS TABLE
-- =============================================================================
-- Stores user's goals linked to realms
-- Each goal has a target hours per week

create table public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  realm_id uuid references public.life_realms on delete cascade not null,

  -- Goal details
  title text not null,
  hours_per_week numeric(4,1) not null check (hours_per_week >= 0.5 and hours_per_week <= 40),

  -- Status
  is_active boolean default true,

  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================================================
-- ENABLE RLS
-- =============================================================================

alter table public.life_realms enable row level security;
alter table public.user_goals enable row level security;

-- =============================================================================
-- RLS POLICIES - LIFE_REALMS (User-Owns-Row Pattern)
-- =============================================================================

-- SELECT: User can only see their own realms
create policy "Users can view own life_realms"
  on public.life_realms
  for select
  using (auth.uid() = user_id);

-- INSERT: User can only insert realms for themselves
create policy "Users can create own life_realms"
  on public.life_realms
  for insert
  with check (auth.uid() = user_id);

-- UPDATE: User can only update their own realms
create policy "Users can update own life_realms"
  on public.life_realms
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE: User can only delete their own realms
create policy "Users can delete own life_realms"
  on public.life_realms
  for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- RLS POLICIES - USER_GOALS (User-Owns-Row Pattern)
-- =============================================================================

-- SELECT: User can only see their own goals
create policy "Users can view own user_goals"
  on public.user_goals
  for select
  using (auth.uid() = user_id);

-- INSERT: User can only insert goals for themselves
create policy "Users can create own user_goals"
  on public.user_goals
  for insert
  with check (auth.uid() = user_id);

-- UPDATE: User can only update their own goals
create policy "Users can update own user_goals"
  on public.user_goals
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE: User can only delete their own goals
create policy "Users can delete own user_goals"
  on public.user_goals
  for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

-- Trigger for life_realms updated_at
create trigger life_realms_updated_at
  before update on public.life_realms
  for each row execute procedure public.update_updated_at();

-- Trigger for user_goals updated_at
create trigger user_goals_updated_at
  before update on public.user_goals
  for each row execute procedure public.update_updated_at();

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Index for faster lookups by user
create index life_realms_user_id_idx on public.life_realms(user_id);
create index user_goals_user_id_idx on public.user_goals(user_id);
create index user_goals_realm_id_idx on public.user_goals(realm_id);
