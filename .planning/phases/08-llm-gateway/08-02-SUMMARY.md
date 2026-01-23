---
phase: 08-llm-gateway
plan: 02
subsystem: llm
tags: [prompts, goal-parser, clarify, api, parse-goal, natural-language]

# Dependency graph
requires:
  - phase: 08-llm-gateway
    provides: LLM infrastructure (cache, token budget, Anthropic provider)
provides:
  - Goal parser prompt template (natural language to structured goal)
  - Clarify prompt template (focused follow-up questions)
  - POST /api/llm/parse-goal endpoint
affects: [08-llm-gateway, goals, onboarding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Prompt template pattern (buildXxxPrompt + parseXxxResponse)
    - Cached LLM API endpoint pattern

key-files:
  created:
    - src/lib/llm/prompts/goal-parser.ts
    - src/lib/llm/prompts/clarify.ts
    - src/app/api/llm/parse-goal/route.ts
  modified: []

key-decisions:
  - "8 realm types mapping to life_realms table"
  - "Required fields: hours_per_week, sessions_per_week, realm_name"
  - "10 requests/min rate limit for parse-goal endpoint"
  - "Response caching via LRU cache for identical inputs"
  - "Clarification questions limited to 2-3 per response"

patterns-established:
  - "GoalParserResponse union type (ParsedGoal | ClarificationNeeded)"
  - "isClarificationNeeded() type guard pattern"
  - "LLM endpoint: auth -> rate limit -> status check -> cache check -> call -> track -> cache -> parse -> respond"

# Metrics
duration: 6 min
completed: 2026-01-23
---

# Phase 8 Plan 02: Parse Goal and Clarify Endpoints Summary

**Natural language goal parsing with structured extraction, clarifying question generation, and cached API endpoint at /api/llm/parse-goal**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-23T21:34:50Z
- **Completed:** 2026-01-23T21:40:24Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Goal parser prompt template extracting structured data from natural language descriptions
- Clarify prompt template generating focused follow-up questions with optional options
- POST /api/llm/parse-goal endpoint with caching, rate limiting, and token tracking

## Task Commits

Each task was committed atomically:

1. **Task 1: Create goal parser prompt template** - `ffd174e` (feat)
2. **Task 2: Create clarify prompt template** - `45cf864` (feat)
3. **Task 3: Create parse-goal API endpoint** - `7cef1e4` (feat)

## Files Created/Modified

- `src/lib/llm/prompts/goal-parser.ts` - buildGoalParserPrompt(), parseGoalResponse(), ParsedGoal type
- `src/lib/llm/prompts/clarify.ts` - buildClarifyPrompt(), parseClarifyResponse(), ClarifyResponse type
- `src/app/api/llm/parse-goal/route.ts` - POST endpoint with auth, rate limiting, caching, token tracking

## Decisions Made

- **8 realm types**: health, career, learning, relationships, creativity, finance, personal, spiritual (matches life_realms table)
- **Required fields for clarification**: hours_per_week, sessions_per_week, realm_name (must ask if missing)
- **10 requests/min rate limit**: Prevents abuse while allowing reasonable usage
- **0.3 temperature**: Low creativity for consistent structured output
- **500 max tokens**: Sufficient for JSON response, limits cost

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Note: Tasks 1-2 were pre-committed by a prior session with 08-03 labels. The work was complete and correct, so Task 3 (API endpoint) was the only new implementation needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Parse-goal endpoint ready for frontend integration
- Prompt templates reusable for other LLM features
- Ready for 08-03-PLAN.md (Explain Rationale and Preferences)

---
*Phase: 08-llm-gateway*
*Completed: 2026-01-23*
