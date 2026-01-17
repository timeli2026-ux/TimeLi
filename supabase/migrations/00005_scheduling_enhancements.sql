-- Scheduling enhancements for cognitive science support
-- Phase 5: Scheduling Engine - Plan 01
-- Adds fields for habit stacking, deadline awareness, ultradian rhythms, and recovery buffers

-- =============================================================================
-- USER_GOALS ENHANCEMENTS
-- =============================================================================

-- Cognitive load for decision fatigue awareness (Baumeister)
ALTER TABLE user_goals ADD COLUMN cognitive_load text
  CHECK (cognitive_load IN ('high', 'medium', 'low')) DEFAULT 'medium';

-- Deep work flag for flow state protection (Csikszentmihalyi, Newport)
ALTER TABLE user_goals ADD COLUMN requires_deep_work boolean DEFAULT false;

-- Deadline support for urgency-based scheduling
ALTER TABLE user_goals ADD COLUMN deadline date;
ALTER TABLE user_goals ADD COLUMN deadline_type text
  CHECK (deadline_type IN ('hard', 'soft', 'none')) DEFAULT 'none';

-- Habit stacking / Implementation intentions (Fogg, Gollwitzer)
-- Anchor goals to fixed events for 40% faster habit formation
ALTER TABLE user_goals ADD COLUMN anchor_type text
  CHECK (anchor_type IN ('none', 'after_event', 'before_event')) DEFAULT 'none';
ALTER TABLE user_goals ADD COLUMN anchor_event_id uuid
  REFERENCES fixed_commitments(id) ON DELETE SET NULL;

-- Session duration constraints
ALTER TABLE user_goals ADD COLUMN minimum_session_minutes integer DEFAULT 30;
ALTER TABLE user_goals ADD COLUMN preferred_session_minutes integer DEFAULT 60;

-- Intensity for recovery buffer calculation
ALTER TABLE user_goals ADD COLUMN intensity_level integer
  CHECK (intensity_level >= 1 AND intensity_level <= 5) DEFAULT 3;

-- =============================================================================
-- USER_PREFERENCES ENHANCEMENTS
-- =============================================================================

-- Chronotype for energy alignment (Kleitman's BRAC)
ALTER TABLE user_preferences ADD COLUMN chronotype text
  CHECK (chronotype IN ('early_bird', 'night_owl', 'intermediate')) DEFAULT 'intermediate';

-- Weekend sleep schedule (students often have different weekend times)
ALTER TABLE user_preferences ADD COLUMN weekend_sleep_start time;
ALTER TABLE user_preferences ADD COLUMN weekend_sleep_end time;

-- =============================================================================
-- INDEXES FOR SCHEDULING QUERIES
-- =============================================================================

-- Index for deadline-based priority queries
CREATE INDEX user_goals_deadline_idx ON user_goals(deadline) WHERE deadline IS NOT NULL;

-- Index for anchor relationships
CREATE INDEX user_goals_anchor_event_idx ON user_goals(anchor_event_id) WHERE anchor_event_id IS NOT NULL;
