-- Cleanup and recreate tables for onboarding
-- Run this to fix partial migration state

-- Drop existing objects (if they exist)
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can view own commitments" ON fixed_commitments;
DROP POLICY IF EXISTS "Users can insert own commitments" ON fixed_commitments;
DROP POLICY IF EXISTS "Users can update own commitments" ON fixed_commitments;
DROP POLICY IF EXISTS "Users can delete own commitments" ON fixed_commitments;

DROP TABLE IF EXISTS fixed_commitments CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;

-- Create the update_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create user_preferences table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  sleep_start TIME NOT NULL DEFAULT '23:00',
  sleep_end TIME NOT NULL DEFAULT '07:00',
  meal_breakfast_start TIME,
  meal_breakfast_duration INTEGER,
  meal_lunch_start TIME,
  meal_lunch_duration INTEGER,
  meal_dinner_start TIME,
  meal_dinner_duration INTEGER,
  commute_morning_start TIME,
  commute_morning_duration INTEGER,
  commute_evening_start TIME,
  commute_evening_duration INTEGER,
  life_realms JSONB,
  initial_actions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create fixed_commitments table
CREATE TABLE fixed_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_commitments ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_preferences
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS policies for fixed_commitments
CREATE POLICY "Users can view own commitments"
  ON fixed_commitments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own commitments"
  ON fixed_commitments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own commitments"
  ON fixed_commitments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own commitments"
  ON fixed_commitments FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_fixed_commitments_user_id ON fixed_commitments(user_id);
CREATE INDEX idx_fixed_commitments_day ON fixed_commitments(user_id, day_of_week);

-- Create triggers for updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_fixed_commitments_updated_at
  BEFORE UPDATE ON fixed_commitments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
