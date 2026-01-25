-- Add review_notes column to generated_schedules table
-- Phase 10: Hardening & Launch - Plan 02
-- Stores weekly reflection notes for the review feature

-- =============================================================================
-- ADD REVIEW_NOTES COLUMN
-- =============================================================================

ALTER TABLE public.generated_schedules
  ADD COLUMN IF NOT EXISTS review_notes text;
