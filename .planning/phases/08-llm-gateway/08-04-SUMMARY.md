---
phase: 08-llm-gateway
plan: 04
subsystem: llm
tags: [budget, tokens, session-tracking, usage-api, cost-control]

# Dependency graph
requires:
  - phase: 08-llm-gateway
    provides: LLM infrastructure (Anthropic provider, cache, token budget, prompts)
provides:
  - Session budget tracking with 30-min TTL
  - Combined budget checking (daily + session)
  - GET /api/llm/usage endpoint for usage visibility
  - POST /api/llm/explain endpoint for schedule explanations
  - POST /api/llm/confirm-preference endpoint for preference questions
  - Budget enforcement in all LLM endpoints
affects: [08-llm-gateway, scheduling-engine, chat, billing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - In-memory session store with TTL
    - Combined budget checking pattern
    - Token estimation for pre-flight checks

key-files:
  created:
    - src/app/api/llm/usage/route.ts
    - src/app/api/llm/explain/route.ts
    - src/app/api/llm/confirm-preference/route.ts
  modified:
    - src/lib/llm/token-budget.ts
    - src/lib/llm/router.ts
    - src/app/api/llm/parse-goal/route.ts

key-decisions:
  - "Session ID = hash(userId + 30-min window index) for consistent sessions"
  - "In-memory session store with auto-cleanup on access"
  - "429 response with type (daily_limit | session_limit) for clear error handling"
  - "X-Token-Usage header in all LLM endpoint responses"
  - "Cache hit/miss tracking for usage statistics"

patterns-established:
  - "checkCombinedBudget() checks both daily and session before LLM calls"
  - "estimateTokens() for pre-flight budget checks"
  - "Session tracking via llm_session_id cookie"

# Metrics
duration: 5 min
completed: 2026-01-23
---

# Phase 8 Plan 04: Cost Control and Usage Tracking Summary

**Session budget tracking with 3k/500 limits, combined budget enforcement in all endpoints, and GET /api/llm/usage for comprehensive usage visibility**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-23T21:42:29Z
- **Completed:** 2026-01-23T21:47:02Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Extended token-budget service with in-memory session tracking (30-min TTL, 3k input/500 output)
- Created checkCombinedBudget() for checking both daily and session limits simultaneously
- Created GET /api/llm/usage endpoint returning comprehensive stats (daily, session, cache)
- Created POST /api/llm/explain endpoint for schedule explanations (<=240 chars)
- Created POST /api/llm/confirm-preference endpoint for preference confirmation questions
- Integrated budget enforcement into parse-goal, explain, and confirm-preference endpoints
- Added X-Token-Usage response header for client-side tracking
- Added estimateTokens() helper for pre-flight budget checks

## Task Commits

Each task was committed atomically:

1. **Task 1: Add session budget tracking to token service** - `09e0692` (feat)
2. **Task 2: Create usage tracking API endpoint** - `b04008d` (feat)
3. **Task 3: Integrate budget checks into all LLM endpoints** - `8c7067f` (feat)

## Files Created/Modified

- `src/lib/llm/token-budget.ts` - Extended with session tracking, checkCombinedBudget(), generateSessionId()
- `src/lib/llm/router.ts` - Added estimateTokens() and estimateOutputTokens() helpers
- `src/app/api/llm/usage/route.ts` - New GET endpoint for usage statistics
- `src/app/api/llm/explain/route.ts` - New POST endpoint for schedule explanations
- `src/app/api/llm/confirm-preference/route.ts` - New POST endpoint for preference confirmation
- `src/app/api/llm/parse-goal/route.ts` - Updated with budget checks and session tracking

## Decisions Made

- **Session ID generation**: hash(userId + 30-min window index) ensures same user gets consistent session within window
- **In-memory session store**: Appropriate for dev, auto-cleans expired sessions on access
- **429 with type field**: Returns `daily_limit` or `session_limit` so client knows which was hit
- **X-Token-Usage header**: Provides input/output/provider info without bloating response body
- **Cache tracking functions**: recordCacheHit() and recordCacheMiss() exported from usage route for statistics

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 8 (LLM Gateway) is now complete with all 4 plans finished
- Token budgets enforced at 100k/20k daily and 3k/500 per 30-min session
- All LLM endpoints return 429 with informative errors when budget exceeded
- Usage visibility available at GET /api/llm/usage
- Ready for Phase 9 (Testing & Polish) or Phase 10 (Launch Readiness)

---
*Phase: 08-llm-gateway*
*Completed: 2026-01-23*
