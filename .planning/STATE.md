# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-15)

**Core value:** Generate a weekly schedule from goals and constraints that respects all hard constraints and explains its reasoning.
**Current focus:** Phase 7 — Goals & Preferences

## Current Position

Phase: 7 of 10 (Goals & Preferences)
Plan: 1 of 3 in current phase (07-01 complete)
Status: In progress
Last activity: 2026-01-23 — Completed 07-01-PLAN.md (Goals API)

Progress: ██████████████████████░ 71%

## Performance Metrics

**Velocity:**
- Total plans completed: 22
- Average duration: 6 min
- Total execution time: 2.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 3/3 | 18 min | 6 min |
| 2 | 3/3 | 15 min | 5 min |
| 3 | 3/3 | 12 min | 4 min |
| 4 | 3/3 | 15 min | 5 min |
| 5 | 3/3 | 15 min | 5 min |
| 6 | 6/6 | 54 min | 9 min |
| 7 | 1/3 | 8 min | 8 min |

**Recent Trend:**
- Last 5 plans: 06-04 (20 min), 06-05 (15 min), 06-06 (4 min), 6.5-03 (N/A), 07-01 (8 min)
- Trend: Phase 7 started - Goals API complete

## Major Revision: CALENDAR_REVISION.md

Created 2026-01-17 after user testing revealed critical issues:
- Calendar used mock data instead of real API
- No schedule persistence (lost on refresh)
- Missing dashboard sidebar and chatbox
- Scheduler bug (rationale never attached to events)
- Locked events all gray instead of realm-colored

**Resolution:** Expanded Phase 6 from 3 plans to 6 plans, inserted Phase 6.5 for chat functionality.

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Security-first approach: Security requirements integrated throughout phases rather than bolted on at end
- 10-phase structure: Expanded from 8 to 10 phases to properly address security
- shadcn/ui new-york style: Clean, professional aesthetic with neutral base color
- Profiles table cascade delete: When auth.users deleted, profiles automatically cleaned up
- Default timezone America/New_York: Can be changed during onboarding
- RLS policies deferred to Phase 3: Enabled now but policies written in dedicated phase
- Zod for env validation: Fail-fast on import, type-safe access
- Graceful gitleaks skip: Pre-commit hook skips if gitleaks not installed
- Dependabot weekly schedule: Minor/patch updates grouped to reduce PR noise
- (auth) route group for auth pages: Clean URLs without /auth prefix
- Middleware uses getUser() not getSession(): More reliable session validation per Supabase docs
- Inline SVG for Google icon: No external icon dependency needed
- OAuth requests offline access with consent: Ensures refresh token retrieval
- (roadmap) Goals & Preferences moved before Scheduling Engine: Data models must exist first
- (security) Rate limiting and headers moved to Phase 3: Early protection, not at launch
- (auth) Added password reset flow: forgot-password and reset-password pages
- (auth) Centralized validation in src/lib/validations/auth.ts: Proper email regex, reusable schemas
- (rls) SELECT/UPDATE only for profiles: INSERT via trigger, DELETE via cascade from auth.users
- (rls) Four standard RLS patterns documented for future tables
- (security) In-memory rate limiter for dev (Upstash for production at scale)
- (security) CSP header deferred to Phase 10 (needs all external resources known)
- (onboarding) 8-step wizard flow for comprehensive preference collection (was 7, added Buffer step)
- (onboarding) Middleware profile query for onboarding status (can optimize with session claims later)
- (onboarding) Minimal onboarding layout without sidebar for focused experience
- (onboarding) Step components use controlled input pattern with value/onChange props
- (onboarding) Slider steps set to 15 min for durations, 5 min for buffer time
- (calendar) 16px per 15-min slot (64px per hour) for compact but readable grid
- (calendar) Week starts Monday (Mon-Sun), navigation limited to current week through +4 weeks
- (calendar) 8 realm colors for visual distinction (health, career, learning, relationships, creativity, finance, personal, spiritual)
- (calendar) Flexibility dots: green=high, yellow=medium, red=low
- (calendar) Single popover open at a time for clean UX
- (calendar) Three-column layout: Dashboard | WeekGrid | Chatbox
- (calendar) Dashboard hidden on <lg screens, chatbox hidden on <xl screens
- (calendar) Locked events colored by realm (meals=health, commute=personal, fixed=career), only sleep is gray
- (database) Schedule persistence with generated_schedules table (JSONB events)
- (database) Type assertions (supabase as any) until types regenerated after migration
- (chat) Phase 6.5 inserted for LLM-powered schedule refinement
- (calendar) Local state tracking for completion status (completedEventIds Set)
- (calendar) Removed disabled Reschedule button - cleaner UX until Phase 6.5
- (llm) Self-hosted vLLM strategy: GPU compute on RunPod/Lambda, time-windowed availability, graceful degradation when offline
- (llm) Provider abstraction: LLMProvider interface supports self-hosted, API fallback, offline providers
- (llm) Hybrid fallback with API rate limit: OpenAI GPT-4o-mini as fallback, 10 messages/day per user limit
- (llm) Time-window scheduling: LLM_SCHEDULE env var for GPU availability windows (e.g., "09:00-14:00")
- (chatbox) 30-second status check interval for LLM availability detection
- (chatbox) Three-state UI: loading, offline, online for clear user feedback
- (chatbox) Message bubble design: user right-aligned primary, assistant left-aligned muted
- (goals) API uses (supabase as any) pattern for untyped table queries
- (goals) Migration endpoint creates realms if missing, skips duplicates
- (goals) Responses include realm name via join with life_realms

### Pending Todos

- Test chat functionality when OpenAI API key is configured

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-23
Stopped at: Completed 07-01-PLAN.md (Goals API)
Resume file: None
Next: 07-02-PLAN.md (Preferences System)
