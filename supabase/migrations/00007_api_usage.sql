-- API Usage Tracking for Rate Limiting
-- Phase 6.5: Schedule Chat - Plan 01
--
-- Tracks per-user daily API usage when using OpenAI fallback.
-- Users get 10 API messages per day, resets at midnight.

-- API usage table
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One row per user per day
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own usage"
  ON api_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Function for atomic increment (upsert with increment)
-- Called by the API usage service
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

-- Index for fast lookups by user and date
CREATE INDEX idx_api_usage_user_date ON api_usage(user_id, date);

-- Cleanup old usage records (optional, run periodically)
-- DELETE FROM api_usage WHERE date < CURRENT_DATE - INTERVAL '30 days';
