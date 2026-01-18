# Plan 06-04 Summary: Database & API Integration

## Overview

**Status:** Complete
**Duration:** ~20 min
**Date:** 2026-01-17

## What Was Built

### Database Migration (`00006_schedule_persistence.sql`)

Created 4 new tables for schedule persistence:

1. **generated_schedules**
   - Stores weekly schedules with events as JSONB
   - Unique constraint on (user_id, week_start)
   - Stats and unscheduled_goals tracking

2. **schedule_completions**
   - Tracks completed/skipped/partial events
   - Links to schedule and goal for analytics

3. **schedule_feedback**
   - Stores user preferences from chat/interactions
   - Types: time_preference, avoid_time, goal_preference, pin_event, block_slot

4. **schedule_conversations**
   - Chat history for LLM-powered schedule modifications
   - One conversation per user per week

All tables have:
- RLS policies (users can only access own data)
- Updated_at triggers
- Appropriate indexes

### Scheduler Bug Fix (`engine.ts`)

Fixed critical bug where `generateRationale()` was never called:

```typescript
// Before: rationale was undefined
const event: ScheduleEvent = { ... }

// After: rationale is attached
event.rationale = generateRationale(event, result.slotScore, currentContext)
```

Also fixed anchored events to include proper habit stacking rationale.

### API Endpoints

1. **GET /api/schedule/[weekStart]**
   - Loads saved schedule for a specific week
   - Returns { exists: boolean, schedule: ... }

2. **POST /api/schedule/generate** (updated)
   - Added weekStart, scope, feedback parameters
   - Saves generated schedule to database with upsert
   - Loads previous week's schedule for stability scoring

3. **POST /api/schedule/update** (updated)
   - Now persists changes to database
   - Validates user owns the schedule

4. **POST /api/schedule/complete** (updated)
   - Now persists completion to schedule_completions table

### Calendar Page Rewrite

Major rewrite removing ~300 lines of mock data:

- Removed `generateMockEvents()` completely
- Added `loadSchedule()` effect on mount and week change
- Added proper loading, error, empty states
- Added "Generate Schedule" button for empty weeks
- All changes now persist via API calls

### Locked Event Coloring (`calendar-event.tsx`)

Added realm-based coloring for locked events:

```typescript
const EVENT_TYPE_REALM_MAP = {
  meal: 'health',      // Green
  commute: 'personal', // Cyan
  fixed: 'career',     // Purple
}
```

Only sleep events remain gray.

## Files Modified

- `supabase/migrations/00006_schedule_persistence.sql` (new)
- `src/lib/scheduling/engine.ts`
- `src/app/api/schedule/[weekStart]/route.ts` (new)
- `src/app/api/schedule/generate/route.ts`
- `src/app/api/schedule/complete/route.ts`
- `src/app/api/schedule/update/route.ts`
- `src/app/(protected)/calendar/page.tsx`
- `src/components/calendar/calendar-event.tsx`

## Technical Notes

- Used `(supabase as any)` type assertions for new tables until Supabase types are regenerated
- Created explicit `ScheduleRow` interface for type safety
- Migration applied manually via Supabase SQL editor (file: `supabase_sql_editor.sql`)

## Commit

```
feat(06-04): integrate calendar with real API and schedule persistence
```
