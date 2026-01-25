-- Waitlist Table for Pre-Launch Email Collection
-- Phase 10: Hardening & Launch - Plan 01
--
-- Creates waitlist table for collecting emails before launch.
-- Anyone can join the waitlist (no auth required).

-- =============================================================================
-- WAITLIST TABLE
-- =============================================================================
-- Collects email addresses for pre-launch signups.
-- No user_id reference - these are prospective users.

CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert into waitlist (no auth required for joining)
CREATE POLICY "Anyone can join waitlist"
  ON waitlist FOR INSERT
  WITH CHECK (TRUE);

-- Only authenticated users can view waitlist (for admin purposes later)
-- For now, no SELECT policy means regular users can't read the list
-- Admin access via service role key in dashboard

-- Index for email uniqueness check performance
CREATE INDEX idx_waitlist_email ON waitlist(email);
