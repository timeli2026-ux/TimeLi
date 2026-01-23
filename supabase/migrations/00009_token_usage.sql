-- Token Usage Tracking for Budget Enforcement
-- Phase 8: LLM Gateway - Plan 01
--
-- Tracks per-user token usage for LLM budget enforcement.
-- Budget limits from PRD: 100k input / 20k output daily, 3k / 500 per session.

-- Token usage table
CREATE TABLE token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  provider TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

-- Users can only read their own usage
CREATE POLICY "Users can view own token usage"
  ON token_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Index for fast daily queries by user
CREATE INDEX idx_token_usage_user_date ON token_usage(user_id, date);

-- Index for provider analytics
CREATE INDEX idx_token_usage_provider ON token_usage(provider, date);
