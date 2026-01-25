---
phase: 11-database-models
plan: 01
subsystem: database
tags: [supabase, postgresql, rls, zod, api, crud]

# Dependency graph
requires:
  - phase: 04-onboarding-flow
    provides: user-owns-row RLS pattern from life_realms
  - phase: 03-database-rls
    provides: update_updated_at trigger function
provides:
  - courses table with schedule jsonb
  - courses CRUD API endpoints
  - course validation schemas
affects: [12-syllabus-import, 13-new-onboarding, 14-scheduling-engine-refactor, 16-calendar-management]

# Tech tracking
tech-stack:
  added: []
  patterns: [course schedule jsonb for meeting times, semester filtering index]

key-files:
  created:
    - supabase/migrations/00014_courses_table.sql
    - src/lib/validations/courses.ts
    - src/app/api/courses/route.ts
    - src/app/api/courses/[id]/route.ts
  modified: []

key-decisions:
  - "Schedule stored as JSONB array of meeting times [{day, start, end}]"
  - "Color field for calendar display differentiation"
  - "Semester field for filtering courses by academic term"

patterns-established:
  - "Course schedule JSONB: [{day: 0-6, start: 'HH:mm', end: 'HH:mm'}]"

# Metrics
duration: 3min
completed: 2026-01-25
---

# Phase 11 Plan 01: Courses Table & CRUD API Summary

**Courses table with schedule JSONB for meeting times, full CRUD API with validation and RLS policies**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-25T18:51:01Z
- **Completed:** 2026-01-25T18:54:33Z
- **Tasks:** 3
- **Files created:** 4

## Accomplishments

- Created courses table migration with RLS policies (user-owns-row pattern)
- Zod validation schemas for course forms with schedule time validation
- Full CRUD API at /api/courses and /api/courses/[id]
- TypeScript types: CourseSchedule, CourseFormData, CourseUpdateData, CourseResponse

## Task Commits

Each task was committed atomically:

1. **Task 1: Create courses table migration** - `1432809` (feat)
2. **Task 2: Create course validation schema** - `a529ea8` (feat)
3. **Task 3: Create courses API routes** - `751acbe` (feat)

## Files Created/Modified

- `supabase/migrations/00014_courses_table.sql` - Courses table with RLS, indexes, trigger
- `src/lib/validations/courses.ts` - Zod schemas for course validation
- `src/app/api/courses/route.ts` - GET/POST for courses list
- `src/app/api/courses/[id]/route.ts` - GET/PUT/DELETE for individual courses

## Decisions Made

- **Schedule as JSONB:** Storing meeting times as [{day: 0-6, start: "HH:mm", end: "HH:mm"}] for flexibility
- **Semester field:** Required field to support filtering courses by academic term
- **Color default:** '#3B82F6' (blue) for consistent calendar display

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Courses table ready for migration (run `npx supabase db push`)
- CRUD API functional and follows established patterns
- Ready for Plan 11-02 (assignments table and API)

---
*Phase: 11-database-models*
*Completed: 2026-01-25*
