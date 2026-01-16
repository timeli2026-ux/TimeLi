-- Onboarding tables for TimeLi
-- Phase 4: Onboarding Flow - Plan 01
-- Tables for user preferences and fixed commitments

-- =============================================================================
-- USER_PREFERENCES TABLE
-- =============================================================================
-- Stores user schedule preferences collected during onboarding
-- One row per user (user_id is unique)

create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade unique not null,

  -- Timezone
  timezone text not null default 'America/New_York',

  -- Sleep schedule
  sleep_start time not null default '23:00',   -- Bedtime
  sleep_end time not null default '07:00',     -- Wake time

  -- Meal times (nullable - user may skip meals)
  meal_breakfast_start time default '08:00',
  meal_breakfast_duration integer default 30,   -- Duration in minutes
  meal_lunch_start time default '12:00',
  meal_lunch_duration integer default 45,
  meal_dinner_start time default '18:30',
  meal_dinner_duration integer default 60,

  -- Buffer time between activities
  buffer_minutes integer default 15,

  -- Commute times (nullable - not everyone commutes)
  commute_morning_start time,
  commute_morning_duration integer,
  commute_evening_start time,
  commute_evening_duration integer,

  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================================================
-- FIXED_COMMITMENTS TABLE
-- =============================================================================
-- Stores recurring fixed commitments (classes, meetings, etc.)

create table public.fixed_commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,

  -- Commitment details
  title text not null,
  day_of_week integer not null check (day_of_week >= 0 and day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time time not null,
  end_time time not null,
  is_recurring boolean default true,

  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================================================
-- ENABLE RLS
-- =============================================================================

alter table public.user_preferences enable row level security;
alter table public.fixed_commitments enable row level security;

-- =============================================================================
-- RLS POLICIES - USER_PREFERENCES (User-Owns-Row Pattern)
-- =============================================================================

-- SELECT: User can only see their own preferences
create policy "Users can view own user_preferences"
  on public.user_preferences
  for select
  using (auth.uid() = user_id);

-- INSERT: User can only insert preferences for themselves
create policy "Users can create own user_preferences"
  on public.user_preferences
  for insert
  with check (auth.uid() = user_id);

-- UPDATE: User can only update their own preferences
create policy "Users can update own user_preferences"
  on public.user_preferences
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE: User can only delete their own preferences
create policy "Users can delete own user_preferences"
  on public.user_preferences
  for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- RLS POLICIES - FIXED_COMMITMENTS (User-Owns-Row Pattern)
-- =============================================================================

-- SELECT: User can only see their own commitments
create policy "Users can view own fixed_commitments"
  on public.fixed_commitments
  for select
  using (auth.uid() = user_id);

-- INSERT: User can only insert commitments for themselves
create policy "Users can create own fixed_commitments"
  on public.fixed_commitments
  for insert
  with check (auth.uid() = user_id);

-- UPDATE: User can only update their own commitments
create policy "Users can update own fixed_commitments"
  on public.fixed_commitments
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE: User can only delete their own commitments
create policy "Users can delete own fixed_commitments"
  on public.fixed_commitments
  for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

-- Trigger for user_preferences updated_at
create trigger user_preferences_updated_at
  before update on public.user_preferences
  for each row execute procedure public.update_updated_at();

-- Trigger for fixed_commitments updated_at
create trigger fixed_commitments_updated_at
  before update on public.fixed_commitments
  for each row execute procedure public.update_updated_at();
