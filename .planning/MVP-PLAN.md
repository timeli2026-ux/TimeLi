# MVP Ship Plan - TimeLi Student Daily Coach

**Created:** 2026-01-28
**Goal:** Ship working MVP ASAP

---

## Current State Analysis

### What's Working
- Student onboarding wizard (5 steps: Basics, Classes, Assignments, Goals, Generate)
- Syllabus parsing via Claude API
- Courses & assignments saved to database
- Calendar page with week grid, drag/drop, chat sidebar (v1 feature)
- Assignments page showing list with mark complete
- Auth, Stripe, settings infrastructure

### What's Broken/Missing
1. **Dashboard is empty** - Just a placeholder after onboarding
2. **No Today View** - The core v2 daily coach experience doesn't exist
3. **Scheduling mismatch** - v1 scheduler designed for habits, not deadlines
4. **Disconnect** - Student data (courses/assignments) not feeding into schedule generation
5. **No clear user path** - Onboarding completes → empty dashboard → confusion

---

## MVP Strategy: Simple Daily Coach + Adaptive Calendar

**Core insight:** Students need to know what to do TODAY + see it on a calendar that adapts.

### What We're Building (MVP Scope)

1. **Today View (replaces dashboard)** - THE product
   - Today's classes (from courses table)
   - Today's scheduled study sessions (from generated schedule)
   - Urgent assignments sorted by deadline
   - "Start Work" and "Mark Done" actions
   - "Regenerate Schedule" button

2. **Auto-generate schedule after onboarding**
   - Call `/api/schedule/generate` when onboarding completes
   - Schedule is created immediately, no manual trigger needed
   - User sees their week planned out right away

3. **Adaptive Calendar (existing v1, enhanced)**
   - Keep existing calendar page with week view
   - Shows generated study sessions + class blocks
   - Recalibrate button + chat already work
   - Add link from Today View to Calendar

4. **Simplify navigation**
   - Today (home) → Assignments → Calendar → Settings
   - Remove Goals, Review (not needed for MVP)

### What We're Cutting

| Feature | Status | Action |
|---------|--------|--------|
| Life Realms (Phase 14) | Not built | SKIP - hardcode "School" realm |
| Smart Scheduling (Phase 16) | Not built | SKIP - sort by deadline only |
| Week View enhancements (Phase 17) | Partial | KEEP existing v1 calendar |
| Nudges & Insights (Phase 18) | Not built | SKIP entirely |
| Balance tracking | Not built | SKIP - focus on deadlines only |
| Realm color coding | Not built | SKIP - single color scheme |
| Complex preferences | Built (v1) | HIDE in MVP |
| Weekly review | Built (v1) | HIDE in MVP |

---

## Implementation Plan

### Phase A: Auto-Generate Schedule + Fix Post-Onboarding (Day 1)

**Goal:** User completes onboarding → schedule generated → sees Today View with their plan

**Tasks:**
1. Modify onboarding completion to auto-generate schedule
2. Replace empty dashboard with Today View component
3. Fetch today's classes, scheduled sessions, and urgent assignments
4. Display in simple, clean UI

**Files to modify:**
- `src/app/api/onboarding/student/complete/route.ts` - Call schedule generation after saving data
- `src/app/(protected)/dashboard/page.tsx` - Replace with Today View
- Create `src/components/today/today-view.tsx`
- Create `src/lib/hooks/use-today.ts` - Fetch schedule + assignments for today

### Phase B: Today View Core Features (Days 2-3)

**Goal:** Functional daily coach experience with scheduled sessions

**Today View sections:**
1. **Header**: Date, greeting, quick stats ("3 assignments due this week")
2. **Today's Schedule**: Timeline showing classes + study sessions for today
   - Pulled from `generated_schedules` table
   - Classes shown as fixed blocks
   - Study sessions shown as scheduled work time
3. **Urgent Work**: Assignments sorted by urgency (due soonest first)
4. **Quick Actions**: Mark done, regenerate schedule
5. **Link to Calendar**: "See full week" → `/calendar`

**API endpoint:**
- `GET /api/today` - Returns today's schedule events + prioritized assignments

**Data sources:**
- `generated_schedules.events` - Today's scheduled sessions (filtered by day)
- `assignments` - All pending, sorted by urgency
- `courses` - For course names/colors

**Urgency calculation:**
```
urgency = estimated_hours / days_until_due
```
Higher urgency = needs attention sooner

### Phase C: Navigation Cleanup (Day 3)

**Goal:** Simple, focused navigation

**Changes:**
1. Make Today the default/home route
2. Simplify nav: Today | Assignments | Calendar | Settings
3. Hide: Goals, Review pages (keep code, just remove from nav)
4. Update middleware redirect: onboarding → /today instead of /dashboard

### Phase D: Quick Polish (Day 4)

**Goal:** Feel polished enough to use

1. Loading states for Today View
2. Empty states ("No classes today", "All caught up!")
3. Error handling
4. Mobile responsive check

### Phase E: Scheduler Tuning (Day 4, if needed)

**Goal:** Fix "intense and odd" scheduling

**Potential issues to address:**
1. **Too many sessions per day** - Cap at 3-4 study sessions max
2. **Not enough spacing** - Ensure breaks between sessions
3. **Weekend scheduling** - Reduce weekend load by default
4. **Deadline weight** - Increase deadline proximity weight for students

**Quick fixes (scoring.ts):**
- Increase `deadlineProximity` weight to 0.40 for hard deadlines
- Reduce max sessions per day
- Add minimum gap between study sessions (30 min)

**Files:**
- `src/lib/scheduling/scoring.ts` - Weight adjustments
- `src/lib/scheduling/engine.ts` - Session limits

---

## Detailed Component Spec: Today View

```
┌─────────────────────────────────────────────┐
│  Good morning, Alex!         Mon, Jan 28    │
│  3 assignments due this week                │
├─────────────────────────────────────────────┤
│  TODAY'S SCHEDULE                           │
│  ┌─────────────────────────────────────┐   │
│  │ 9:00 AM   CS 101 (Class)        🔒  │   │
│  │ 10:30 AM  Study: CS HW 3        📚  │   │
│  │ 11:00 AM  MATH 201 (Class)      🔒  │   │
│  │ 2:00 PM   Study: MATH PS 5      📚  │   │
│  │ 4:00 PM   Exercise              💪  │   │
│  └─────────────────────────────────────┘   │
│                    [See Full Week →]        │
├─────────────────────────────────────────────┤
│  URGENT                                     │
│  ┌─────────────────────────────────────┐   │
│  │ ⚠️ CS 101 Homework 3                 │   │
│  │    Due tomorrow · 2h estimated       │   │
│  │    [Mark Done]                       │   │
│  ├─────────────────────────────────────┤   │
│  │ 📝 MATH 201 Problem Set 5            │   │
│  │    Due in 3 days · 3h estimated      │   │
│  │    [Mark Done]                       │   │
│  └─────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  THIS WEEK                                  │
│  ┌─────────────────────────────────────┐   │
│  │ Total: 15h of work                   │   │
│  │ Completed: 3/8 assignments           │   │
│  └─────────────────────────────────────┘   │
│            [🔄 Regenerate Schedule]         │
└─────────────────────────────────────────────┘
```

**Schedule Display Logic:**
- Pull today's events from `generated_schedules.events`
- Filter by `dayOfWeek === today`
- Sort by start time
- Show type indicator: 🔒 = locked/class, 📚 = study, 💪 = goal

---

## Technical Notes

### Data Sources
- **Today's schedule**: `generated_schedules.events` → filter by today's day of week
- **Assignments**: `assignments` table → filter `status != 'completed'`, sort by due_date
- **Courses**: `courses` table → for names and colors
- **User**: `profiles` table for name

### Existing APIs to Use
- `GET /api/schedule/{weekStart}` - Already exists, returns week's events
- `GET /api/assignments` - Already exists
- `POST /api/schedule/generate` - Already exists, creates schedule
- `POST /api/assignments/{id}/complete` - Mark assignment done
- Need: `GET /api/today` - Aggregates schedule events + assignments for today

### Schedule Generation Flow

**On onboarding complete:**
1. Save courses, assignments, goals (already done)
2. Convert assignments → `user_goals` with deadlines (already done)
3. Convert courses → `fixed_commitments` (already done)
4. **NEW: Call schedule generation API**
5. Redirect to dashboard/today view

**Existing scheduler capabilities:**
- CSP algorithm with cognitive science scoring
- Deadline proximity scoring (prioritizes urgent items)
- Spaced practice (distributes sessions across days)
- Infeasibility detection (warns if too much work)
- Recalibration with feedback

**Why this works:**
- Scheduler is already sophisticated and tested
- Student data is already being converted correctly
- Just need to trigger it and display results

---

## Out of Scope (Future)

- Life realms / balance tracking
- Smart study session scheduling
- Notifications / nudges
- Calendar sync (Google)
- Time tracking
- Weekly insights
- Stripe billing (keep free for now)

---

## Success Criteria

MVP is done when:
1. User completes onboarding → schedule auto-generated → lands on Today View
2. Today View shows today's scheduled sessions (classes + study time)
3. Today View shows urgent assignments with "Mark Done"
4. User can regenerate schedule from Today View
5. User can navigate to full Calendar (week view with all sessions)
6. User can navigate to Assignments list
7. Calendar shows generated schedule with drag/drop + recalibrate
8. Works on mobile (basic responsive)

---

## Estimated Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| A: Auto-generate + Fix onboarding | 3-4 hours | Schedule created on signup |
| B: Today View features | 5-6 hours | Full Today View with schedule timeline |
| C: Nav cleanup | 2-3 hours | Simplified navigation |
| D: Polish | 2-3 hours | Loading/empty states, mobile |
| E: Scheduler tuning (if needed) | 2-3 hours | Better session spacing |
| **Total** | **~2 days** | **Shippable MVP** |

---

## Next Steps

1. Start with Phase A - get the dashboard showing real data
2. Build Today View component incrementally
3. Test with real syllabus data
4. Ship and iterate based on feedback
