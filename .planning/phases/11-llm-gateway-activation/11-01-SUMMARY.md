---
phase: 11-llm-gateway-activation
plan: 01
subsystem: llm
tags: [anthropic, claude, llm, simplification, mvp]

# Dependency graph
requires:
  - phase: 08-llm-gateway
    provides: LLM infrastructure with multi-provider routing
provides:
  - Simplified Anthropic-only LLM system
  - Clean getLLMProvider() and getLLMStatus() APIs
  - Removed ~375 lines of unused code
affects: [phase-12-real-data, phase-13-calendar-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single provider pattern - Anthropic Claude only for MVP"
    - "Offline fallback pattern retained for graceful degradation"

key-files:
  created: []
  modified:
    - src/lib/llm/router.ts
    - src/lib/llm/config.ts
    - src/lib/llm/index.ts
    - src/lib/llm/providers/anthropic.ts
    - src/lib/env.ts
    - src/app/api/llm/status/route.ts
    - src/app/api/chat/route.ts
    - src/app/api/llm/parse-goal/route.ts
    - src/app/api/llm/confirm-preference/route.ts
    - src/app/api/llm/explain/route.ts

key-decisions:
  - "Remove multi-provider routing - Anthropic-only simplifies codebase for MVP"
  - "Remove time-window scheduling - not needed without self-hosted GPU"
  - "Keep offline fallback - graceful degradation when API key not configured"

patterns-established:
  - "Simplified provider selection: if API key exists, use provider; else offline"

# Metrics
duration: 4min
completed: 2026-01-25
---

# Phase 11 Plan 01: LLM Simplification Summary

**Simplified LLM gateway from multi-provider routing to Anthropic-only, removing ~375 lines of complexity**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-25T14:02:21Z
- **Completed:** 2026-01-25T14:06:48Z
- **Tasks:** 7/7
- **Files modified:** 10 (2 deleted)

## Accomplishments

- Simplified router from 162 lines to 69 lines (93 lines removed)
- Simplified config from 95 lines to 30 lines (65 lines removed)
- Deleted self-hosted.ts and openai.ts providers (217 lines removed)
- Updated 5 API routes to use simplified function signatures
- Cleaned up environment validation schema

## Task Commits

All tasks committed atomically due to interdependencies:

1. **Task 1: Simplify LLM router** - `2abe548`
2. **Task 2: Simplify LLM config** - `2abe548`
3. **Task 3: Delete unused providers** - `2abe548`
4. **Task 4: Update AnthropicProvider** - `2abe548`
5. **Task 5: Clean up .env.example** - (already done in prior commit)
6. **Task 6: Update env.ts schema** - `2abe548`
7. **Task 7: Fix API routes** - `2abe548`

**Note:** Tasks 1-4, 6-7 committed together as they are tightly coupled (pre-commit hook requires passing build).

## Files Created/Modified

**Deleted:**
- `src/lib/llm/providers/self-hosted.ts` - Self-hosted vLLM provider
- `src/lib/llm/providers/openai.ts` - OpenAI fallback provider

**Modified:**
- `src/lib/llm/router.ts` - Simplified to Anthropic + Offline only
- `src/lib/llm/config.ts` - Removed time-window scheduling
- `src/lib/llm/index.ts` - Updated exports
- `src/lib/llm/providers/anthropic.ts` - Uses config for model default
- `src/lib/env.ts` - Removed unused LLM env vars
- `src/app/api/llm/status/route.ts` - Simplified status endpoint
- `src/app/api/chat/route.ts` - Removed router context
- `src/app/api/llm/parse-goal/route.ts` - Removed router context
- `src/app/api/llm/confirm-preference/route.ts` - Removed router context
- `src/app/api/llm/explain/route.ts` - Removed router context

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Commit all tasks together | Pre-commit hook requires passing build; changes are interdependent |
| Keep offline fallback | Graceful degradation when ANTHROPIC_API_KEY not set |
| Remove RouterContext | No longer needed without multi-provider routing |
| Remove API usage tracking from chat | Was only for OpenAI fallback quota management |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Additional API routes needed fixing**
- **Found during:** Task 7
- **Issue:** Plan only listed 3 routes but `confirm-preference` and `explain` routes also used old signatures
- **Fix:** Updated all 5 routes that import getLLMProvider/getLLMStatus
- **Files modified:** Added confirm-preference/route.ts, explain/route.ts
- **Verification:** Build passes
- **Committed in:** 2abe548

---

**Total deviations:** 1 auto-fixed (blocking)
**Impact on plan:** Necessary for complete implementation. No scope creep.

## Issues Encountered

None - all tasks completed successfully.

## User Setup Required

None - no external service configuration required. Users should already have ANTHROPIC_API_KEY configured per .env.example.

## Next Phase Readiness

- LLM system simplified and ready for production use
- All API routes working with Anthropic Claude
- Ready for Phase 11 Plan 02 (if exists) or Phase 12

---
*Phase: 11-llm-gateway-activation*
*Completed: 2026-01-25*
