-- Assignments table for TimeLi
-- Phase 11: Database & Models - Plan 02
-- Enables students to track assignments with due dates and estimated hours

-- =============================================================================
-- ASSIGNMENTS TABLE
-- =============================================================================
-- Stores user's assignments with optional course reference
-- Allows standalone assignments (course_id nullable) for personal deadlines

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  course_id uuid references public.courses on delete cascade, -- Nullable for standalone assignments

  -- Assignment details
  title text not null,                            -- e.g., "Problem Set 3", "Final Exam"
  type text not null check (type in ('homework', 'exam', 'project', 'reading', 'quiz', 'paper', 'other')),
  due_date timestamptz not null,
  estimated_hours numeric(4,1) not null check (estimated_hours >= 0.5 and estimated_hours <= 100),
  priority text default 'medium' check (priority in ('high', 'medium', 'low')),
  notes text,                                     -- Optional notes

  -- Status tracking
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  completed_at timestamptz,                       -- Set when status changes to completed

  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================================================
-- ENABLE RLS
-- =============================================================================

alter table public.assignments enable row level security;

-- =============================================================================
-- RLS POLICIES - ASSIGNMENTS (User-Owns-Row Pattern)
-- =============================================================================

-- SELECT: User can only see their own assignments
create policy "Users can view own assignments"
  on public.assignments
  for select
  using (auth.uid() = user_id);

-- INSERT: User can only insert assignments for themselves
create policy "Users can create own assignments"
  on public.assignments
  for insert
  with check (auth.uid() = user_id);

-- UPDATE: User can only update their own assignments
create policy "Users can update own assignments"
  on public.assignments
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE: User can only delete their own assignments
create policy "Users can delete own assignments"
  on public.assignments
  for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================

-- Trigger for assignments updated_at (uses existing update_updated_at function)
create trigger assignments_updated_at
  before update on public.assignments
  for each row execute procedure public.update_updated_at();

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Index for faster lookups by user
create index assignments_user_id_idx on public.assignments(user_id);

-- Index for course filtering (partial for non-null values)
create index assignments_course_id_idx on public.assignments(course_id) where course_id is not null;

-- Composite index for due date ordering
create index assignments_due_date_idx on public.assignments(user_id, due_date);

-- Composite index for status filtering
create index assignments_status_idx on public.assignments(user_id, status);
