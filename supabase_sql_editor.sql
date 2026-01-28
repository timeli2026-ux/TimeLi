-- =============================================================================
-- TIMELI SUPABASE SQL EDITOR
-- =============================================================================
-- This file contains SQL to be pasted into the Supabase SQL Editor
--
-- INSTRUCTIONS:
-- 1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
-- 2. Copy everything below the "RUN THIS" section
-- 3. Paste into the SQL editor and click "Run"
--
-- WHAT ALREADY EXISTS (DO NOT RECREATE):
-- - profiles table + policies
-- - user_preferences table + policies
-- - fixed_commitments table + policies
-- - update_updated_at() function
--
-- WHAT THIS ADDS:
-- - life_realms table (life areas for organizing goals)
-- - user_goals table (goals linked to realms)
-- - generated_schedules table (stores weekly schedules)
-- - schedule_completions table (tracks completed/skipped events)
-- - schedule_feedback table (user preferences from chat)
-- - schedule_conversations table (chat history with LLM)
-- - api_usage table (daily API rate limiting)
-- - subscriptions table (Stripe subscription tracking)
-- - usage_tracking table (billing period usage limits)
-- =============================================================================

-- =============================================================================
-- RUN THIS - PASTE EVERYTHING BELOW INTO SUPABASE SQL EDITOR
-- =============================================================================

-- Drop tables if they exist (clean slate - order matters for foreign keys)
DROP TABLE IF EXISTS public.schedule_conversations CASCADE;
DROP TABLE IF EXISTS public.schedule_feedback CASCADE;
DROP TABLE IF EXISTS public.schedule_completions CASCADE;
DROP TABLE IF EXISTS public.generated_schedules CASCADE;
DROP TABLE IF EXISTS public.user_goals CASCADE;
DROP TABLE IF EXISTS public.life_realms CASCADE;

-- =============================================================================
-- TABLE: life_realms
-- =============================================================================
-- Stores user's life realms (areas of life they want to balance)
-- Examples: Health, Career, Relationships, Personal Growth, etc.

CREATE TABLE public.life_realms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  icon text,
  is_custom boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- =============================================================================
-- TABLE: user_goals
-- =============================================================================
-- Stores user's goals linked to realms with scheduling metadata

CREATE TABLE public.user_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  realm_id uuid REFERENCES public.life_realms ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  hours_per_week numeric(4,1) NOT NULL CHECK (hours_per_week >= 0.5 AND hours_per_week <= 40),
  is_active boolean DEFAULT true,
  -- Cognitive load for decision fatigue awareness
  cognitive_load text CHECK (cognitive_load IN ('high', 'medium', 'low')) DEFAULT 'medium',
  -- Deep work flag for flow state protection
  requires_deep_work boolean DEFAULT false,
  -- Deadline support
  deadline date,
  deadline_type text CHECK (deadline_type IN ('hard', 'soft', 'none')) DEFAULT 'none',
  -- Habit stacking / anchoring
  anchor_type text CHECK (anchor_type IN ('none', 'after_event', 'before_event')) DEFAULT 'none',
  anchor_event_id uuid REFERENCES public.fixed_commitments(id) ON DELETE SET NULL,
  -- Session duration constraints
  minimum_session_minutes integer DEFAULT 30,
  preferred_session_minutes integer DEFAULT 60,
  -- Intensity for recovery buffer calculation
  intensity_level integer CHECK (intensity_level >= 1 AND intensity_level <= 5) DEFAULT 3,
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================================================
-- RLS: life_realms
-- =============================================================================

ALTER TABLE public.life_realms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own life_realms"
  ON public.life_realms FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create own life_realms"
  ON public.life_realms FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own life_realms"
  ON public.life_realms FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own life_realms"
  ON public.life_realms FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- =============================================================================
-- RLS: user_goals
-- =============================================================================

ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own user_goals"
  ON public.user_goals FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create own user_goals"
  ON public.user_goals FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own user_goals"
  ON public.user_goals FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own user_goals"
  ON public.user_goals FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- =============================================================================
-- TRIGGERS: life_realms & user_goals
-- =============================================================================

CREATE TRIGGER life_realms_updated_at
  BEFORE UPDATE ON public.life_realms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER user_goals_updated_at
  BEFORE UPDATE ON public.user_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- INDEXES: life_realms & user_goals
-- =============================================================================

CREATE INDEX life_realms_user_id_idx ON public.life_realms(user_id);
CREATE INDEX user_goals_user_id_idx ON public.user_goals(user_id);
CREATE INDEX user_goals_realm_id_idx ON public.user_goals(realm_id);
CREATE INDEX user_goals_deadline_idx ON public.user_goals(deadline) WHERE deadline IS NOT NULL;
CREATE INDEX user_goals_anchor_event_idx ON public.user_goals(anchor_event_id) WHERE anchor_event_id IS NOT NULL;

-- =============================================================================
-- TABLE: generated_schedules
-- =============================================================================
-- Stores weekly schedules generated by the scheduling engine
-- One schedule per user per week

CREATE TABLE public.generated_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  week_start date NOT NULL,
  events jsonb NOT NULL DEFAULT '[]',
  stats jsonb,
  unscheduled_goals jsonb DEFAULT '[]',
  generated_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- =============================================================================
-- TABLE: schedule_completions
-- =============================================================================
-- Tracks task completion history for analytics and learning

CREATE TABLE public.schedule_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  schedule_id uuid REFERENCES public.generated_schedules ON DELETE CASCADE,
  event_id text NOT NULL,
  goal_id uuid REFERENCES public.user_goals ON DELETE SET NULL,
  status text CHECK (status IN ('completed', 'skipped', 'partial')) NOT NULL,
  notes text,
  scheduled_date date,
  scheduled_start_time time,
  completed_at timestamptz DEFAULT now()
);

-- =============================================================================
-- TABLE: schedule_feedback
-- =============================================================================
-- Stores user preferences learned from interactions and chat

CREATE TABLE public.schedule_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  feedback_type text CHECK (feedback_type IN (
    'time_preference',
    'avoid_time',
    'goal_preference',
    'pin_event',
    'block_slot',
    'day_preference',
    'general'
  )) NOT NULL,
  goal_id uuid REFERENCES public.user_goals ON DELETE CASCADE,
  day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time,
  end_time time,
  preference_value text,
  is_active boolean DEFAULT true,
  source text CHECK (source IN ('chat', 'manual', 'pattern')) DEFAULT 'manual',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================================================
-- TABLE: schedule_conversations
-- =============================================================================
-- Stores chat history for LLM-powered schedule modifications

CREATE TABLE public.schedule_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  week_start date NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.generated_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_conversations ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES: generated_schedules
-- =============================================================================

CREATE POLICY "Users can view own schedules"
  ON public.generated_schedules FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create own schedules"
  ON public.generated_schedules FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own schedules"
  ON public.generated_schedules FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own schedules"
  ON public.generated_schedules FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- =============================================================================
-- RLS POLICIES: schedule_completions
-- =============================================================================

CREATE POLICY "Users can view own completions"
  ON public.schedule_completions FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create own completions"
  ON public.schedule_completions FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own completions"
  ON public.schedule_completions FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own completions"
  ON public.schedule_completions FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- =============================================================================
-- RLS POLICIES: schedule_feedback
-- =============================================================================

CREATE POLICY "Users can view own feedback"
  ON public.schedule_feedback FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create own feedback"
  ON public.schedule_feedback FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own feedback"
  ON public.schedule_feedback FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own feedback"
  ON public.schedule_feedback FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- =============================================================================
-- RLS POLICIES: schedule_conversations
-- =============================================================================

CREATE POLICY "Users can view own conversations"
  ON public.schedule_conversations FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create own conversations"
  ON public.schedule_conversations FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own conversations"
  ON public.schedule_conversations FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own conversations"
  ON public.schedule_conversations FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- =============================================================================
-- TRIGGERS: updated_at
-- =============================================================================

CREATE TRIGGER generated_schedules_updated_at
  BEFORE UPDATE ON public.generated_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER schedule_feedback_updated_at
  BEFORE UPDATE ON public.schedule_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER schedule_conversations_updated_at
  BEFORE UPDATE ON public.schedule_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX generated_schedules_user_week_idx
  ON public.generated_schedules(user_id, week_start);

CREATE INDEX schedule_completions_schedule_idx
  ON public.schedule_completions(schedule_id);

CREATE INDEX schedule_completions_user_date_idx
  ON public.schedule_completions(user_id, scheduled_date);

CREATE INDEX schedule_feedback_user_active_idx
  ON public.schedule_feedback(user_id)
  WHERE is_active = true;

CREATE INDEX schedule_conversations_user_week_idx
  ON public.schedule_conversations(user_id, week_start);

-- =============================================================================
-- TABLE: api_usage
-- =============================================================================
-- Tracks per-user daily API usage when using OpenAI fallback.
-- Users get 10 API messages per day, resets at midnight.

DROP TABLE IF EXISTS public.api_usage CASCADE;

CREATE TABLE public.api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON public.api_usage FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- Function for atomic increment (upsert with increment)
CREATE OR REPLACE FUNCTION increment_api_usage(p_user_id UUID, p_date DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO api_usage (user_id, date, message_count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    message_count = api_usage.message_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE INDEX idx_api_usage_user_date ON public.api_usage(user_id, date);

-- =============================================================================
-- TABLE: subscriptions (BILLING)
-- =============================================================================
-- Tracks Stripe subscription status for each user

DROP TABLE IF EXISTS public.subscriptions CASCADE;

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  plan TEXT NOT NULL DEFAULT 'monthly',
  price_cents INTEGER NOT NULL DEFAULT 1500,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own subscription"
  ON public.subscriptions FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own subscription"
  ON public.subscriptions FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE INDEX idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription ON public.subscriptions(stripe_subscription_id);

-- =============================================================================
-- TABLE: usage_tracking (BILLING)
-- =============================================================================
-- Tracks feature usage per billing period for limit enforcement

DROP TABLE IF EXISTS public.usage_tracking CASCADE;

CREATE TABLE public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  schedule_generations INTEGER NOT NULL DEFAULT 0,
  recalibrations INTEGER NOT NULL DEFAULT 0,
  llm_requests INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);

ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage tracking"
  ON public.usage_tracking FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own usage tracking"
  ON public.usage_tracking FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own usage tracking"
  ON public.usage_tracking FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE INDEX idx_usage_tracking_user_period ON public.usage_tracking(user_id, period_start);

-- =============================================================================
-- TABLE: courses (STUDENT ONBOARDING)
-- =============================================================================
-- Stores user's courses/classes with schedule information

DROP TABLE IF EXISTS public.assignments CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;

CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  instructor text,
  color text DEFAULT '#3B82F6',
  schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  location text,
  credits integer,
  semester text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own courses" ON public.courses FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can create own courses" ON public.courses FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update own courses" ON public.courses FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete own courses" ON public.courses FOR DELETE USING ((SELECT auth.uid()) = user_id);

CREATE TRIGGER courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX courses_user_id_idx ON public.courses(user_id);
CREATE INDEX courses_semester_idx ON public.courses(user_id, semester);

-- =============================================================================
-- TABLE: assignments (STUDENT ONBOARDING)
-- =============================================================================
-- Stores user's assignments with optional course reference

CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES public.courses ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('homework', 'exam', 'project', 'reading', 'quiz', 'paper', 'other')),
  due_date timestamptz NOT NULL,
  estimated_hours numeric(4,1) NOT NULL CHECK (estimated_hours >= 0.5 AND estimated_hours <= 100),
  priority text DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  notes text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assignments" ON public.assignments FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can create own assignments" ON public.assignments FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update own assignments" ON public.assignments FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete own assignments" ON public.assignments FOR DELETE USING ((SELECT auth.uid()) = user_id);

CREATE TRIGGER assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX assignments_user_id_idx ON public.assignments(user_id);
CREATE INDEX assignments_course_id_idx ON public.assignments(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX assignments_due_date_idx ON public.assignments(user_id, due_date);
CREATE INDEX assignments_status_idx ON public.assignments(user_id, status);

-- =============================================================================
-- SCHEMA RELOAD
-- =============================================================================

NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- SUCCESS!
-- =============================================================================
-- If you see "Success. No rows returned" the migration worked.
--
-- Tables created:
-- - life_realms (life areas for organizing goals)
-- - user_goals (goals with scheduling metadata)
-- - generated_schedules (weekly schedules)
-- - schedule_completions (task completion tracking)
-- - schedule_feedback (user preferences from chat)
-- - schedule_conversations (chat history)
-- - api_usage (rate limiting)
-- - subscriptions (Stripe billing)
-- - usage_tracking (billing period limits)
--
-- You can verify by running:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
