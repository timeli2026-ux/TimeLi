---
phase: 12-syllabus-import
plan: 01
subsystem: api
tags: [llm, syllabus, parsing, zod, anthropic]

# Dependency graph
requires:
  - phase: 11-database-models
    provides: courses and assignments table schemas
provides:
  - POST /api/syllabus/parse endpoint for LLM-powered syllabus extraction
  - SyllabusParserResponse types for parsed course/assignment data
  - Hour estimation heuristics for all assignment types
affects: [12-syllabus-import, student-onboarding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - LLM endpoint pattern with auth, rate limit, budget check, cache

key-files:
  created:
    - src/lib/llm/prompts/syllabus-parser.ts
    - src/lib/validations/syllabus.ts
    - src/app/api/syllabus/parse/route.ts
  modified: []

key-decisions:
  - "Rate limit 5/min for syllabus parsing (heavier than goal parsing)"
  - "maxTokens: 2000 for LLM call (syllabi generate long assignment lists)"
  - "Temperature: 0.2 for accuracy in date/type extraction"

patterns-established:
  - "Hour estimation heuristics embedded in prompt for all assignment types"

# Metrics
duration: 5min
completed: 2026-01-25
---

# Phase 12 Plan 01: LLM-Powered Syllabus Parsing Summary

**POST /api/syllabus/parse endpoint with embedded hour estimation heuristics for extracting course info and assignments from syllabus text**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-25T19:09:55Z
- **Completed:** 2026-01-25T19:14:45Z
- **Tasks:** 3
- **Files created:** 3

## Accomplishments

- Created comprehensive syllabus parser prompt with hour estimation heuristics for homework, reading, quiz, exam, paper, and project types
- Built Zod validation schemas reusing assignmentTypeEnum from existing validations
- Implemented full API endpoint following parse-goal pattern (auth, rate limit, budget, cache, token tracking)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create syllabus parser prompt template** - `ccc2ebd` (feat)
2. **Task 2: Create syllabus validation schemas** - `c268a00` (feat)
3. **Task 3: Create syllabus parse API endpoint** - `181e4e7` (feat)

## Files Created/Modified

- `src/lib/llm/prompts/syllabus-parser.ts` - System prompt with hour heuristics, JSON extraction, type guards
- `src/lib/validations/syllabus.ts` - Zod schemas for request/response validation
- `src/app/api/syllabus/parse/route.ts` - API endpoint with full LLM integration

## Decisions Made

- **Rate limit 5/min:** Syllabus parsing is heavier (more tokens) than goal parsing (10/min)
- **maxTokens: 2000:** Syllabi can have 20+ assignments, need room for full JSON response
- **Temperature: 0.2:** Lower than goal parsing (0.3) for more accurate date and type extraction

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Minor Zod error handling fix: Used `.issues` instead of `.errors` for ZodError validation details

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Syllabus parse endpoint fully functional and follows established patterns
- Ready for 12-02: Syllabus import UI with text input and assignment review/confirmation

---
*Phase: 12-syllabus-import*
*Completed: 2026-01-25*
