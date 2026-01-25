-- Courses table for TimeLi
-- Phase 11: Database & Models - Plan 01
-- Enables students to track their classes with meeting times for scheduling

-- =============================================================================
-- COURSES TABLE
-- =============================================================================
-- Stores user's courses/classes with schedule information
-- Each course has meeting times (schedule) as JSONB array

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,

  -- Course details
  name text not null,                          -- e.g., "CS 301 - Algorithms"
  instructor text,                             -- Professor/instructor name (optional)
  color text default '#3B82F6',                -- Hex color for calendar display

  -- Schedule: array of meeting times [{day: 0-6, start: "09:00", end: "10:30"}]
  schedule jsonb not null default '[]'::jsonb,

  -- Additional info
  location text,                               -- Classroom/building (optional)
  credits integer,                             -- Course credits (optional)
  semester text,                               -- e.g., "Spring 2026"

  -- Status
  is_active boolean default true,

  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================================================
-- ENABLE RLS
-- =============================================================================

alter table public.courses enable row level security;

-- =============================================================================
-- RLS POLICIES - COURSES (User-Owns-Row Pattern)
-- =============================================================================

-- SELECT: User can only see their own courses
create policy "Users can view own courses"
  on public.courses
  for select
  using (auth.uid() = user_id);

-- INSERT: User can only insert courses for themselves
create policy "Users can create own courses"
  on public.courses
  for insert
  with check (auth.uid() = user_id);

-- UPDATE: User can only update their own courses
create policy "Users can update own courses"
  on public.courses
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE: User can only delete their own courses
create policy "Users can delete own courses"
  on public.courses
  for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================

-- Trigger for courses updated_at (uses existing update_updated_at function)
create trigger courses_updated_at
  before update on public.courses
  for each row execute procedure public.update_updated_at();

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Index for faster lookups by user
create index courses_user_id_idx on public.courses(user_id);

-- Composite index for semester filtering
create index courses_semester_idx on public.courses(user_id, semester);
