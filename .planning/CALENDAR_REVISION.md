# Calendar System Revision Plan

## Executive Summary

The current calendar implementation uses mock data and is missing critical functionality. This document outlines a complete revision to create a production-ready calendar system with real data integration, dashboard, LLM-powered feedback, and iterative schedule refinement.

---

## Current State Analysis

### What Works
- Scheduling engine (CSP solver with cognitive science scoring)
- Constraint checking (sleep, meals, commitments, buffers)
- Goal frequency calculation
- Infeasibility detection
- Flexibility classification
- Basic calendar grid UI

### What's Broken/Missing

| Issue | Severity | Current State |
|-------|----------|---------------|
| Mock data instead of real API | CRITICAL | `generateMockEvents()` hardcoded |
| No schedule persistence | CRITICAL | Generated schedules lost on refresh |
| No dashboard sidebar | HIGH | Missing realm stats, charts, progress |
| No chatbox for LLM feedback | HIGH | No way to refine schedule via conversation |
| Locked events all gray | MEDIUM | Should be colored by realm |
| Rationale not attached to events | MEDIUM | Scheduler bug - never calls `generateRationale()` |
| Recurring commitments not expanded | MEDIUM | `isRecurring` flag ignored |
| Recalibrate lacks feedback prompt | MEDIUM | Just regenerates, no user input |
| Events may not be clickable | MEDIUM | Possible z-index/pointer-events issue |
| Only one week shows data | LOW | Other weeks show empty |

---

## Architectural Vision

### Target Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Header: Week of Jan 20-26  [← →] [Today] [Recalibrate]             │
├──────────────┬─────────────────────────────────────┬────────────────┤
│              │                                     │                │
│  DASHBOARD   │         WEEK GRID                   │   CHATBOX      │
│  ──────────  │         ─────────                   │   ───────      │
│              │                                     │                │
│  Realm Stats │  Mon Tue Wed Thu Fri Sat Sun        │  [AI Avatar]   │
│  ┌─────────┐ │  ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐       │                │
│  │ Pie     │ │  │ │ │ │ │ │ │ │ │ │ │ │ │ │       │  "I see you    │
│  │ Chart   │ │  │ │ │ │ │ │ │ │ │ │ │ │ │ │       │   have 3 hrs   │
│  └─────────┘ │  │ │ │ │ │ │ │ │ │ │ │ │ │ │       │   of deep      │
│              │  │ │ │ │ │ │ │ │ │ │ │ │ │ │       │   work..."     │
│  Progress    │  │ │ │ │ │ │ │ │ │ │ │ │ │ │       │                │
│  ──────────  │  └─┘ └─┘ └─┘ └─┘ └─┘ └─┘ └─┘       │  [Chat Input]  │
│  ▓▓▓▓▓░░░░░  │                                     │  ────────────  │
│  Health 60%  │                                     │  "Move gym to  │
│  ▓▓▓▓░░░░░░  │                                     │   evenings"    │
│  Learning 40%│                                     │                │
│              │                                     │  [Send]        │
│  Weekly Goal │                                     │                │
│  ──────────  │                                     │                │
│  18/25 hrs   │                                     │                │
│              │                                     │                │
└──────────────┴─────────────────────────────────────┴────────────────┘
```

### Data Flow

```
User opens calendar
       │
       ▼
┌──────────────────┐
│ Check for saved  │
│ schedule in DB   │
└────────┬─────────┘
         │
    ┌────┴────┐
    │ Exists? │
    └────┬────┘
         │
    ┌────┴────┬────────────┐
    │ Yes     │ No         │
    ▼         ▼            │
 Load from  Generate new   │
 database   via API        │
    │         │            │
    │         ▼            │
    │    Save to DB        │
    │         │            │
    └────┬────┘            │
         │                 │
         ▼                 │
    Display in             │
    calendar grid          │
         │                 │
         ▼                 │
    User interacts:        │
    - Drag/drop event      │
    - Click "Recalibrate"  │
    - Chat: "Move X to Y"  │
         │                 │
         ▼                 │
    Update schedule        │
    (optimistic + persist) │
```

---

## Database Schema Additions

### New Tables Required

```sql
-- Store generated schedules
CREATE TABLE generated_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  week_start date NOT NULL,
  events jsonb NOT NULL,
  stats jsonb,
  generated_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Enable RLS
ALTER TABLE generated_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own schedules"
  ON generated_schedules FOR ALL
  USING (auth.uid() = user_id);

-- Store completion history
CREATE TABLE schedule_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  schedule_id uuid REFERENCES generated_schedules,
  event_id text NOT NULL,
  goal_id uuid REFERENCES user_goals,
  status text CHECK (status IN ('completed', 'skipped', 'partial')) NOT NULL,
  notes text,
  completed_at timestamptz DEFAULT now()
);

ALTER TABLE schedule_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own completions"
  ON schedule_completions FOR ALL
  USING (auth.uid() = user_id);

-- Store user schedule overrides/preferences
CREATE TABLE schedule_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  feedback_type text CHECK (feedback_type IN (
    'time_preference',      -- "I prefer mornings"
    'avoid_time',           -- "Never schedule after 8pm"
    'goal_preference',      -- "Schedule gym before work"
    'pin_event',            -- "Keep this time slot"
    'block_slot'            -- "This time doesn't work"
  )) NOT NULL,
  goal_id uuid REFERENCES user_goals,
  day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time,
  end_time time,
  preference_value text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE schedule_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own feedback"
  ON schedule_feedback FOR ALL
  USING (auth.uid() = user_id);

-- Chat history for schedule conversations
CREATE TABLE schedule_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  week_start date NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE schedule_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations"
  ON schedule_conversations FOR ALL
  USING (auth.uid() = user_id);
```

### Modifications to Existing Tables

```sql
-- Add realm_id to fixed events for coloring
ALTER TABLE fixed_commitments
  ADD COLUMN realm_id uuid REFERENCES life_realms;

-- Add time preferences to user_goals
ALTER TABLE user_goals
  ADD COLUMN preferred_time_window text CHECK (preferred_time_window IN (
    'morning', 'afternoon', 'evening', 'any'
  )) DEFAULT 'any',
  ADD COLUMN excluded_days integer[] DEFAULT '{}';
```

---

## Scheduler Bug Fixes

### Bug 1: Rationale Not Attached

**Location:** `src/lib/scheduling/engine.ts:452-466`

**Fix:**
```typescript
// After creating event, add rationale
import { generateRationale } from './rationale'

const event: ScheduleEvent = {
  id: generateEventId(),
  type: 'goal',
  title: goal.title,
  slot: result.slotScore.slot,
  goalId: goal.id,
  realmId: goal.realmId,
  isLocked: false,
  cognitiveLoad: goal.cognitiveLoad,
  isAnchoredSession: false,
  rationale: generateRationale(
    { ...scoringContext, goal },
    result.slotScore,
    weights
  ),
}
```

### Bug 2: Recurring Commitments Not Expanded

**Location:** `src/lib/scheduling/constraints.ts:55-64`

**Current behavior:** Each commitment blocks only its specified `dayOfWeek`.

**Analysis:** This is actually CORRECT for the current data model. Fixed commitments in the database have a specific `day_of_week` field. A weekly recurring meeting on Monday is stored as `day_of_week: 1`. The "recurring" aspect means it repeats every week, not every day.

**No code change needed** - the data model is correct. The mock data in the calendar was the problem.

---

## Revised Phase Structure

### Phase 6: Calendar UI (REVISED)

**Original scope:** 3 plans (grid, events, drag/drop)
**New scope:** 6 plans (complete calendar system)

| Plan | Name | Description |
|------|------|-------------|
| 06-01 | Week Grid Foundation | ✅ DONE |
| 06-02 | Event Display | ✅ DONE |
| 06-03 | VOID | Original drag/drop plan - superseded |
| 06-04 | Database & API Integration | Schedule persistence, real data |
| 06-05 | Dashboard Sidebar | Realm stats, pie chart, progress |
| 06-06 | Interactions & Polish | Drag/drop, completion, recalibrate |

### Phase 6.5: Schedule Chat (NEW - Insert)

**Goal:** LLM-powered schedule refinement via conversation

| Plan | Name | Description |
|------|------|-------------|
| 6.5-01 | Chat Infrastructure | Claude API setup, conversation storage |
| 6.5-02 | Chatbox UI | Sidebar component, message display |
| 6.5-03 | Schedule Modification | Parse requests, apply changes, feedback loop |

### Phase 7: Goals & Preferences (ADJUSTED)

Move preference extraction to work with chat feedback.

---

## Detailed Plan: 06-04 Database & API Integration

### Objective
Connect calendar to real scheduling API, persist generated schedules, and load from database.

### Tasks

1. **Create database migration**
   - Add `generated_schedules` table
   - Add `schedule_completions` table
   - Add `schedule_feedback` table
   - Add RLS policies

2. **Fix scheduler rationale bug**
   - Import `generateRationale` in engine.ts
   - Call it when creating events
   - Attach to event object

3. **Create schedule persistence API**
   - `GET /api/schedule/[weekStart]` - Load saved schedule
   - `POST /api/schedule/generate` - Generate and save
   - `PATCH /api/schedule/[weekStart]` - Update single event
   - `POST /api/schedule/complete` - Log completion

4. **Update calendar page**
   - Remove mock data
   - Fetch real schedule on mount
   - Handle loading/error states
   - Persist changes on drag/drop

5. **Fix locked event coloring**
   - Update CalendarEvent to use realm colors for locked events
   - Add realmId to meal/commute events based on user preferences

### Files Modified
- `src/lib/scheduling/engine.ts`
- `src/app/api/schedule/[weekStart]/route.ts` (new)
- `src/app/api/schedule/generate/route.ts`
- `src/app/api/schedule/complete/route.ts`
- `src/app/(protected)/calendar/page.tsx`
- `src/components/calendar/calendar-event.tsx`
- `supabase/migrations/XXXXXX_schedule_persistence.sql` (new)

---

## Detailed Plan: 06-05 Dashboard Sidebar

### Objective
Add left sidebar with realm statistics, pie chart, and goal progress.

### Tasks

1. **Create Dashboard component**
   - Realm time distribution pie chart (use recharts)
   - Per-realm progress bars
   - Weekly hours summary
   - Habit streak indicators

2. **Calculate statistics from schedule**
   - Group events by realm
   - Calculate time per realm
   - Compare to goal targets
   - Track completion rates

3. **Integrate into calendar layout**
   - Three-column layout (dashboard | grid | chatbox placeholder)
   - Responsive: collapse sidebar on mobile
   - Sync with schedule data

### Files Modified
- `src/components/calendar/dashboard-sidebar.tsx` (new)
- `src/components/calendar/realm-pie-chart.tsx` (new)
- `src/components/calendar/goal-progress.tsx` (new)
- `src/app/(protected)/calendar/page.tsx`

---

## Detailed Plan: 06-06 Interactions & Polish

### Objective
Complete drag/drop, completion logging, and recalibrate with feedback.

### Tasks

1. **Fix event click/popover issues**
   - Debug pointer-events
   - Ensure popover opens reliably
   - Fix z-index stacking

2. **Implement drag/drop with persistence**
   - Optimistic UI update
   - API call to persist
   - Rollback on error
   - Validate constraints on drop

3. **Completion logging**
   - Connect to real API
   - Store in database
   - Update dashboard stats
   - Visual feedback on event

4. **Enhanced recalibrate flow**
   - Add feedback textarea: "What would you like to change?"
   - Show preview of changes before applying
   - Confirm before regenerating

### Files Modified
- `src/components/calendar/week-grid.tsx`
- `src/components/calendar/calendar-event.tsx`
- `src/components/calendar/event-popover.tsx`
- `src/components/calendar/recalibrate-dialog.tsx`
- `src/app/api/schedule/update/route.ts`

---

## Detailed Plan: 6.5-01 Chat Infrastructure

### Objective
Set up Claude API integration and conversation storage for schedule chat.

### Tasks

1. **Claude API setup**
   - Server-only API route
   - Environment variable for API key
   - Rate limiting per user
   - Token budget tracking

2. **Conversation storage**
   - Create `schedule_conversations` table
   - Load/save conversation by week
   - Prune old conversations

3. **Schedule context builder**
   - Serialize current schedule for Claude
   - Include user preferences
   - Include available slots

4. **Response parser**
   - Extract schedule modifications
   - Identify clarifying questions
   - Handle errors gracefully

### Files Modified
- `src/lib/llm/claude.ts` (new)
- `src/lib/llm/schedule-context.ts` (new)
- `src/lib/llm/response-parser.ts` (new)
- `src/app/api/chat/schedule/route.ts` (new)
- `supabase/migrations/XXXXXX_schedule_conversations.sql` (new)

---

## Detailed Plan: 6.5-02 Chatbox UI

### Objective
Create right sidebar chatbox for schedule conversations.

### Tasks

1. **Chatbox component**
   - Message list with scroll
   - Input field with send button
   - AI avatar/indicator
   - Typing indicator

2. **Message types**
   - User message
   - AI response
   - Schedule change proposal
   - Confirmation request

3. **Integration with calendar**
   - Highlight affected events when discussing
   - Show before/after preview
   - Apply changes with confirmation

### Files Modified
- `src/components/calendar/chatbox.tsx` (new)
- `src/components/calendar/chat-message.tsx` (new)
- `src/components/calendar/schedule-preview.tsx` (new)
- `src/app/(protected)/calendar/page.tsx`

---

## Detailed Plan: 6.5-03 Schedule Modification

### Objective
Enable LLM to understand and apply schedule changes via conversation.

### Tasks

1. **Intent recognition**
   - "Move X to Y" → relocate event
   - "I prefer mornings" → add preference
   - "Cancel today's gym" → skip event
   - "Add more time for studying" → adjust hours

2. **Change application**
   - Validate against constraints
   - Apply to schedule
   - Persist to database
   - Update UI

3. **Feedback loop**
   - "That doesn't work because..." → iterate
   - Store preferences for future
   - Learn from patterns

4. **System prompts**
   - Schedule-aware context
   - Constraint explanation
   - Suggestion generation

### Files Modified
- `src/lib/llm/intents.ts` (new)
- `src/lib/llm/schedule-modifier.ts` (new)
- `src/lib/llm/prompts/schedule-chat.ts` (new)
- `src/app/api/chat/schedule/route.ts`

---

## Implementation Order

1. **Phase 06-04: Database & API Integration** (Priority: CRITICAL)
   - Unblocks everything else
   - Fixes scheduler bug
   - Provides real data

2. **Phase 06-05: Dashboard Sidebar** (Priority: HIGH)
   - Adds visual value
   - Independent of chat

3. **Phase 06-06: Interactions & Polish** (Priority: HIGH)
   - Completes basic calendar functionality
   - Drag/drop and completion

4. **Phase 6.5-01: Chat Infrastructure** (Priority: MEDIUM)
   - Backend for chat
   - Can work in parallel with 06-05/06-06

5. **Phase 6.5-02: Chatbox UI** (Priority: MEDIUM)
   - UI component
   - Requires 6.5-01

6. **Phase 6.5-03: Schedule Modification** (Priority: MEDIUM)
   - Full feedback loop
   - Requires 6.5-01 and 6.5-02

---

## Success Criteria

### Functional
- [ ] Calendar loads real schedule from database
- [ ] Schedule persists across page refreshes
- [ ] Drag/drop updates schedule and persists
- [ ] Dashboard shows accurate realm statistics
- [ ] Pie chart displays time distribution
- [ ] Progress bars show goal completion
- [ ] Chatbox allows natural language requests
- [ ] "Move gym to evenings" actually moves the events
- [ ] Recalibrate accepts feedback before regenerating
- [ ] Locked events are colored by their realm
- [ ] All events are clickable and show popovers

### Non-Functional
- [ ] Calendar loads in <1.5 seconds
- [ ] Drag/drop feels instant (<200ms)
- [ ] Chat responses arrive in <2 seconds
- [ ] Mobile layout is usable
- [ ] No console errors in production

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| LLM costs spiral | Token budgets, caching, dedup |
| Chat misunderstands user | Confirmation before applying changes |
| Database migrations fail | Test in dev environment first |
| Performance degrades | Lazy load chat, optimize queries |
| Mobile layout breaks | Collapsible sidebars, responsive grid |

---

## Next Steps

1. User approves this revision plan
2. Create migration for new database tables
3. Execute Plan 06-04 (Database & API Integration)
4. Continue with remaining plans in order

---

*Created: 2026-01-17*
*Status: Awaiting approval*
