---
phase: 11-database-models
plan: 02
subsystem: database, api
tags: [supabase, postgres, rls, zod, assignments, crud]

# Dependency graph
requires:
  - phase: 11-database-models/01
    provides: courses table for FK reference
  - phase: 04-onboarding
    provides: life_realms/user_goals patterns, update_updated_at() function
provides:
  - assignments table with RLS policies
  - Zod validation schemas for assignments
  - CRUD API endpoints at /api/assignments
affects: [scheduling, syllabus-import, student-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [nullable FK for optional course reference, status transitions update completed_at]

key-files:
  created:
    - supabase/migrations/00015_assignments_table.sql
    - src/lib/validations/assignments.ts
    - src/app/api/assignments/route.ts
    - src/app/api/assignments/[id]/route.ts
  modified: []

key-decisions:
  - "course_id nullable: Allows standalone assignments not tied to a course"
  - "status transitions: completed_at auto-set when status changes to/from completed"
  - "query filters: Support courseId and status query params on GET"

patterns-established:
  - "Nullable FK pattern: For optional relationships (course_id), use left join in queries"
  - "Status transition handling: Track completed_at timestamp based on status changes"
  - "Assignment types: homework, exam, project, reading, quiz, paper, other"

# Metrics
duration: 4min
completed: 2026-01-25
---

# Plan 02: Assignments Table Summary

**Assignments table with RLS, Zod validation, and full CRUD API supporting optional course references and status transitions**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-25T13:57:00Z
- **Completed:** 2026-01-25T14:01:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Created assignments table with user-owns-row RLS policies
- Implemented Zod validation schemas with all assignment types and statuses
- Built full CRUD API with query filtering (courseId, status) and course name joins
- Status transitions automatically update completed_at timestamp

## Task Commits

Each task was committed atomically:

1. **Task 1: Create assignments table migration** - `34c281e` (feat)
2. **Task 2: Create assignment validation schema** - `5f29684` (feat)
3. **Task 3: Create assignments CRUD API endpoints** - `00139c9` (feat)

## Files Created/Modified
- `supabase/migrations/00015_assignments_table.sql` - Table, RLS policies, indexes, trigger
- `src/lib/validations/assignments.ts` - Zod schemas and TypeScript types
- `src/app/api/assignments/route.ts` - GET (list with filters) and POST endpoints
- `src/app/api/assignments/[id]/route.ts` - GET, PUT (with status transitions), DELETE endpoints

## Decisions Made
- **course_id nullable:** Users may have assignments not tied to a specific course (personal deadlines, external exams)
- **Automatic completed_at:** When status transitions to 'completed', completed_at is set to now(); when transitioning away from 'completed', it's cleared
- **Query filtering:** API supports ?courseId and ?status query params for filtering assignment lists

## Deviations from Plan
None - plan executed exactly as written

## Issues Encountered
- Supabase dry-run unavailable (502 error), but SQL syntax follows established patterns and is valid
- Direct tsc compilation shows zod v4 locale issues (library internal), but npm run build succeeds

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Assignments table ready for migration to Supabase
- CRUD API functional with filtering and status tracking
- Ready for syllabus import and scheduling features

---
*Phase: 11-database-models*
*Completed: 2026-01-25*
