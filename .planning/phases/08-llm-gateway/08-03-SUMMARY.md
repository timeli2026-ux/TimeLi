---
phase: 08-llm-gateway
plan: 03
subsystem: llm
tags: [prompts, logging, security, sec-16, rationale, preferences]

# Dependency graph
requires:
  - phase: 08-llm-gateway
    provides: LLM infrastructure (Anthropic provider, cache, token budget)
  - phase: 05-scheduling-engine
    provides: Scoring types and scheduling types
provides:
  - Explain rationale prompt template (<=240 char explanations)
  - Confirm preference prompt template (conversational pattern detection)
  - Secure LLM logging service (SEC-16 compliant)
affects: [08-llm-gateway, scheduling-engine, chat]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Prompt template pattern with build/parse functions
    - SEC-16 compliant logging (no secrets, hashed PII)

key-files:
  created:
    - src/lib/llm/prompts/explain-rationale.ts
    - src/lib/llm/prompts/confirm-preference.ts
    - src/lib/logging/llm-logger.ts
  modified: []

key-decisions:
  - "<=240 char limit for rationale explanations (UI-friendly)"
  - "SHA-256 first 8 chars for userId hashing in logs"
  - "JSON structured logging for parseability"
  - "Conversational, non-presumptuous preference confirmation"
  - "Pattern templates for common preference types"

patterns-established:
  - "Prompt template: buildXxxPrompt() + parseXxxResponse() pattern"
  - "Secure logging: NEVER log API keys, secrets, full prompts, or PII"
  - "ScoringFactor type for explaining slot selections"

# Metrics
duration: 4 min
completed: 2026-01-23
---

# Phase 8 Plan 03: Explain Rationale and Confirm Preference Summary

**Prompt templates for schedule explanations (<=240 chars) and preference confirmation questions, plus SEC-16 compliant LLM logging service**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-23T21:34:49Z
- **Completed:** 2026-01-23T21:38:25Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Explain rationale prompt template with buildExplainPrompt() and parseExplainResponse() enforcing <=240 char limit
- Confirm preference prompt template with DetectedPattern type and PATTERN_TEMPLATES for common scenarios
- Secure LLM logging service with SEC-16 compliance (no API keys, hashed userIds, structured JSON)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create explain rationale prompt template** - `ffd174e` (feat)
2. **Task 2: Create confirm preference prompt template** - `135ff91` (feat)
3. **Task 3: Create secure LLM logging service** - `45cf864` (feat)

## Files Created/Modified

- `src/lib/llm/prompts/explain-rationale.ts` - buildExplainPrompt(), parseExplainResponse(), buildScoringFactors() for schedule explanations
- `src/lib/llm/prompts/confirm-preference.ts` - buildConfirmPreferencePrompt(), parseConfirmResponse(), PATTERN_TEMPLATES for preference detection
- `src/lib/logging/llm-logger.ts` - logLLMRequest(), sanitizeForLogging(), createLLMLogger() with SEC-16 compliance

## Decisions Made

- **<=240 char explanations**: UI-friendly length that fits in tooltips/cards while being informative
- **SHA-256 hashing for userId**: Privacy-preserving while allowing request correlation (first 8 chars)
- **JSON structured logging**: Enables parsing by log aggregation tools (Datadog, Loki, etc.)
- **Conversational preference questions**: Non-presumptuous phrasing improves user trust and acceptance

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Prompt templates ready for LLM API endpoints (08-04)
- Secure logging ready to integrate into all LLM calls
- Ready for 08-04-PLAN.md (if exists) or phase completion

---
*Phase: 08-llm-gateway*
*Completed: 2026-01-23*
