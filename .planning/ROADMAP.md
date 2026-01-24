# Roadmap: TimeLi

## Overview

Build an AI-assisted weekly scheduling app with security baked in from day one. Start with secure foundation (env vars, secrets scanning), add auth with proper session security, establish RLS policies before any data flows, then build features (onboarding, scheduling engine, calendar UI, goals, LLM gateway, billing) on this secure base. Finish with landing page and final audit.

## Domain Expertise

None

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Security Base** - Project setup with security from day one
- [x] **Phase 2: Auth & Session Security** - Authentication with secure session handling
- [x] **Phase 3: Database & RLS** - Row-level security, input sanitization, and early security hardening
- [x] **Phase 4: Onboarding Flow** - 8-step wizard for user setup
- [x] **Phase 5: Scheduling Engine** - Deterministic constraint satisfaction algorithm
- [x] **Phase 6: Calendar UI** - Week view with dashboard and interactions (expanded to 6 plans)
- [x] **Phase 6.5: Schedule Chat** - LLM-powered schedule refinement via conversation (INSERTED)
- [x] **Phase 7: Goals & Preferences** - Goals management and preference system
- [x] **Phase 8: LLM Gateway** - Server-side AI endpoints with secure logging
- [ ] **Phase 9: Settings & Billing** - Stripe integration with webhook verification
- [ ] **Phase 10: Hardening & Launch** - Landing page, weekly review, final audit

## Phase Details

### Phase 1: Foundation & Security Base
**Goal**: Scaffold project with security infrastructure from day one
**Depends on**: Nothing (first phase)
**Research**: Unlikely (established Next.js + Supabase patterns)
**Requirements**: FOUN-01, FOUN-02, FOUN-03, SEC-01, SEC-02, SEC-03, SEC-09
**Plans**: TBD

Plans:
- [x] 01-01: Next.js 15 scaffold with TypeScript, Tailwind, shadcn/ui
- [x] 01-02: Supabase setup with database schema
- [x] 01-03: Security base (env vars, secrets scanning, dependency scanning)

### Phase 2: Auth & Session Security
**Goal**: Implement authentication with secure session management
**Depends on**: Phase 1
**Research**: Unlikely (Supabase Auth patterns well-documented)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, SEC-11
**Plans**: TBD

Plans:
- [x] 02-01: Email/password signup and login
- [x] 02-02: Google OAuth integration
- [x] 02-03: Session security (token expiration, refresh tokens)

**Post-phase additions:**
- Password reset flow (forgot-password, reset-password pages)
- Centralized auth validation (src/lib/validations/auth.ts)
- Error boundaries and loading states
- Shared GoogleIcon component

### Phase 3: Database & RLS
**Goal**: Establish row-level security, input sanitization, and early security hardening before data flows
**Depends on**: Phase 2
**Research**: Quick verification (RLS patterns well-documented, sanitization standard)
**Requirements**: SEC-05, SEC-06, SEC-07, SEC-08

Plans:
- [x] 03-01: RLS policies for profiles table with pattern documentation
- [x] 03-02: Input sanitization layer with Jest tests
- [x] 03-03: Security hardening (headers, rate limiting) - moved from Phase 10

### Phase 4: Onboarding Flow
**Goal**: 8-step wizard capturing user preferences, life realms, and actions
**Depends on**: Phase 3
**Research**: Unlikely (internal UI patterns)
**Requirements**: ONBD-01, ONBD-02, ONBD-03, ONBD-04, ONBD-05, ONBD-06, ONBD-07, ONBD-08
**Plans**: TBD

Plans:
- [x] 04-01: Onboarding wizard UI and state management
- [x] 04-02: Steps 1-4 (timezone, sleep, meals, commute)
- [x] 04-03: Steps 5-8 (commitments, life realms, actions & habits)

**Post-phase refinements:**
- Removed buffer time step (will be automatic)
- Added flexible meals (toggle on/off, add custom)
- Added Life Realms concept (every moment contributes to a life area)
- Renamed Goals to Actions & Habits with frequency controls
- Database: user_preferences, fixed_commitments, profiles tables

### Phase 5: Scheduling Engine
**Goal**: Deterministic constraint satisfaction algorithm with scoring
**Depends on**: Phase 4 (uses onboarding data: actions, constraints, preferences)
**Research**: Likely (constraint satisfaction algorithms, scheduling heuristics)
**Research topics**: CSP algorithms for scheduling, soft constraint scoring functions, infeasibility detection
**Requirements**: SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05
**Plans**: TBD

Plans:
- [x] 05-01: Core CSP algorithm with hard constraints
- [x] 05-02: Soft constraint scoring system
- [x] 05-03: Infeasibility handling and flexibility classification

### Phase 6: Calendar UI
**Goal**: Interactive week view with dashboard, drag/drop, and event management
**Depends on**: Phase 5
**Research**: Unlikely (standard calendar UI patterns)
**Requirements**: CAL-01, CAL-02, CAL-03, CAL-04, CAL-05, CAL-06, CAL-07, CAL-08
**Plans**: Expanded from 3 to 6 after revision (see CALENDAR_REVISION.md)

Plans:
- [x] 06-01: Week view grid (7 columns, 15-min slots)
- [x] 06-02: Event display (locked vs AI-generated styling)
- [x] 06-03: Drag/drop and completion logging (partially complete, superseded by revision)
- [x] 06-04: Database & API Integration (schedule persistence, rationale bug fix)
- [x] 06-05: Dashboard Sidebar (realm pie chart, goal progress)
- [x] 06-06: Interactions & Polish (recalibrate with feedback prompt)

**Revision Note (2026-01-17)**: User testing revealed critical issues:
- Calendar used mock data instead of real API
- No schedule persistence
- Missing dashboard and chatbox
- Scheduler bug (rationale not attached)
Created CALENDAR_REVISION.md with expanded plan structure.

### Phase 6.5: Schedule Chat (INSERTED)
**Goal**: LLM-powered schedule refinement via conversation
**Depends on**: Phase 6
**Research**: Likely (Claude API patterns, prompt engineering)
**Requirements**: New - schedule modification via natural language

Plans:
- [x] 6.5-01: Chat Infrastructure (Claude API setup, conversation storage)
- [x] 6.5-02: Chatbox UI (message display, input, typing indicator)
- [x] 6.5-03: Schedule Modification (parse requests, apply changes, feedback loop)

### Phase 7: Goals & Preferences
**Goal**: Goals CRUD and comprehensive preference editing
**Depends on**: Phase 6
**Research**: Unlikely (internal CRUD patterns)
**Requirements**: GOAL-01, GOAL-02, PREF-01, PREF-02, PREF-03, PREF-04
**Plans**: TBD

Plans:
- [x] 07-01: Goals/Actions list and edit form
- [x] 07-02: Preferences system (global and per-goal)
- [x] 07-03: Preferences panel UI

### Phase 8: LLM Gateway
**Goal**: Server-side AI endpoints with secure key handling and logging
**Depends on**: Phase 7
**Research**: Likely (Anthropic Claude API, prompt engineering)
**Research topics**: Claude API patterns, token budget enforcement, secure logging practices
**Requirements**: LLM-01, LLM-02, LLM-03, LLM-04, LLM-05, LLM-06, LLM-07, SEC-04, SEC-15, SEC-16
**Plans**: TBD

Plans:
- [x] 08-01: LLM infrastructure (server-only, key protection)
- [x] 08-02: Parse and clarify endpoints
- [x] 08-03: Explain and confirm endpoints
- [x] 08-04: Cost control (budgets, caching, dedup)

### Phase 9: Settings & Billing
**Goal**: Settings page and Stripe integration with webhook security
**Depends on**: Phase 8
**Research**: Likely (Stripe API, webhook patterns)
**Research topics**: Stripe checkout setup intents, webhook signature verification, subscription lifecycle
**Requirements**: SETT-01, BILL-01, BILL-02, BILL-03, BILL-04, BILL-05, SEC-12
**Plans**: TBD

Plans:
- [x] 09-01: Settings page foundation (billing tables, account section)
- [x] 09-02: Stripe integration with webhook verification
- [x] 09-03: Usage tracking and trial logic
- [ ] 09-04: Subscription management UI

### Phase 10: Hardening & Launch
**Goal**: Landing page, weekly review feature, and final security audit
**Depends on**: Phase 9
**Research**: Unlikely (standard patterns)
**Requirements**: LAND-01, REV-01, REV-02, REV-03, SEC-10, SEC-13, SEC-14

Plans:
- [ ] 10-01: Landing page with waitlist
- [ ] 10-02: Weekly review feature
- [ ] 10-03: CSP header finalization
- [ ] 10-04: Final security audit and verification

**Note**: Basic security headers and rate limiting moved to Phase 3 for early protection.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Security Base | 3/3 | Complete | 2026-01-15 |
| 2. Auth & Session Security | 3/3 | Complete | 2026-01-16 |
| 3. Database & RLS | 3/3 | Complete | 2026-01-16 |
| 4. Onboarding Flow | 3/3 | Complete | 2026-01-16 |
| 5. Scheduling Engine | 3/3 | Complete | 2026-01-17 |
| 6. Calendar UI | 6/6 | Complete | 2026-01-18 |
| 6.5. Schedule Chat | 3/3 | Complete | 2026-01-23 |
| 7. Goals & Preferences | 3/3 | Complete | 2026-01-23 |
| 8. LLM Gateway | 4/4 | Complete | 2026-01-23 |
| 9. Settings & Billing | 3/4 | In progress | - |
| 10. Hardening & Launch | 0/4 | Not started | - |

## Notes

**Phase 3 expanded** to include security hardening (headers, rate limiting) - originally in Phase 10. Security hardening should happen early, not at launch.

**Phase 4 (Onboarding)** now collects Actions & Habits with frequency data, providing the goal data needed for the scheduling engine. Goals & Preferences phase (7) is for editing these after onboarding.
