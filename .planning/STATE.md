# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-15)

**Core value:** Generate a weekly schedule from goals and constraints that respects all hard constraints and explains its reasoning.
**Current focus:** Phase 9 — Settings & Billing

## Current Position

Phase: 9 of 10 (Settings & Billing)
Plan: 2 of 4 in current phase
Status: In progress
Last activity: 2026-01-24 — Completed 09-02-PLAN.md (Stripe Integration)

Progress: █████████████████████████████░ 97%

## Performance Metrics

**Velocity:**
- Total plans completed: 29
- Average duration: 6 min
- Total execution time: 2.7 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 3/3 | 18 min | 6 min |
| 2 | 3/3 | 15 min | 5 min |
| 3 | 3/3 | 12 min | 4 min |
| 4 | 3/3 | 15 min | 5 min |
| 5 | 3/3 | 15 min | 5 min |
| 6 | 6/6 | 54 min | 9 min |
| 7 | 3/3 | 20 min | 7 min |
| 8 | 4/4 | 18 min | 4.5 min |
| 9 | 2/4 | 12 min | 6 min |

**Recent Trend:**
- Last 5 plans: 08-03 (4 min), 08-02 (6 min), 08-04 (5 min), 09-01 (4 min), 09-02 (8 min)
- Trend: Stripe integration complete with webhook handling

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
- (goals-ui) useGoals hook with automatic migration check on empty goals
- (goals-ui) GoalsList groups by realm with counts and total hours
- (goals-ui) GoalCard uses realm badge colors matching calendar events
- (goals-ui) GoalFormDialog validates with Zod before submission
- (goals-ui) Created /api/realms endpoint to fetch user realms for form
- (preferences) API uses (supabase as any) pattern for untyped table queries
- (preferences) Partial update support with Zod validation
- (preferences) SchedulePreferencesForm with 5 sections (sleep, energy, meals, commute, buffer)
- (preferences) PreferencesPanel with skeleton loading states
- (preferences) Settings navigation tabs for future settings pages
- (llm-08) claude-3-haiku-20240307 model for cost-effective structured tasks
- (llm-08) In-memory LRU cache (100 entries, 5min TTL) for dev - Upstash for prod
- (llm-08) Token usage records per request for granular analytics
- (llm-08) Fail open on usage tracking errors for UX
- (llm-08) <=240 char limit for rationale explanations (UI-friendly)
- (llm-08) SHA-256 first 8 chars for userId hashing in logs
- (llm-08) Conversational, non-presumptuous preference confirmation
- (llm-08) SEC-16 compliant logging: NEVER log API keys, secrets, or PII
- (llm-08) 8 realm types in goal parser: health, career, learning, relationships, creativity, finance, personal, spiritual
- (llm-08) Required goal fields: hours_per_week, sessions_per_week, realm_name (ask clarification if missing)
- (llm-08) 10 requests/min rate limit for parse-goal endpoint
- (llm-08) Response caching for identical inputs via LRU cache
- (llm-08) Session budget: 3k input / 500 output per 30-min window
- (llm-08) Session ID = hash(userId + window index) for consistent sessions
- (llm-08) checkCombinedBudget() for pre-flight budget checks
- (llm-08) X-Token-Usage response header for client-side tracking
- (llm-08) 429 response with type field (daily_limit | session_limit)
- (billing) Stripe env vars optional for dev flexibility
- (billing) Usage limits with defaults (200 generations, 500 recalibrations)
- (settings) Tab navigation: Preferences | Goals | Account | Subscription
- (stripe) API version 2025-12-15.clover (latest SDK)
- (stripe) Period dates from subscription items (new API structure)
- (stripe) Webhook signature verification (SEC-12)
- (stripe) Graceful degradation when not configured

### Pending Todos

- Test chat functionality when OpenAI API key is configured

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-24
Stopped at: Completed 09-02-PLAN.md (Stripe Integration)
Resume file: None
Next: 09-03-PLAN.md (Usage Tracking)
