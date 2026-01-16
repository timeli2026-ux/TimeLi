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
- [ ] **Phase 3: Database & RLS** - Row-level security, input sanitization, and early security hardening
- [ ] **Phase 4: Onboarding Flow** - 7-step wizard for user setup
- [ ] **Phase 5: Goals & Preferences** - Goals management and preference system (moved earlier - needed by scheduling)
- [ ] **Phase 6: Scheduling Engine** - Deterministic constraint satisfaction algorithm
- [ ] **Phase 7: Calendar UI** - Week view with interactions
- [ ] **Phase 8: LLM Gateway** - Server-side AI endpoints with secure logging
- [ ] **Phase 9: Settings & Billing** - Stripe integration with webhook verification
- [ ] **Phase 10: Landing Page & Launch** - Landing page, weekly review, final audit

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
- [ ] 03-01: RLS policies for profiles table with pattern documentation
- [ ] 03-02: Input sanitization layer with Jest tests
- [ ] 03-03: Security hardening (headers, rate limiting) - moved from Phase 10

### Phase 4: Onboarding Flow
**Goal**: 7-step wizard capturing user preferences and constraints
**Depends on**: Phase 3
**Research**: Unlikely (internal UI patterns)
**Requirements**: ONBD-01, ONBD-02, ONBD-03, ONBD-04, ONBD-05, ONBD-06, ONBD-07, ONBD-08
**Plans**: TBD

Plans:
- [ ] 04-01: Onboarding wizard UI and state management
- [ ] 04-02: Steps 1-4 (timezone, sleep, meals, buffer)
- [ ] 04-03: Steps 5-7 (commute, commitments, goals chat)

### Phase 5: Goals & Preferences
**Goal**: Goals CRUD and comprehensive preference system
**Depends on**: Phase 4
**Research**: Unlikely (internal CRUD patterns)
**Requirements**: GOAL-01, GOAL-02, PREF-01, PREF-02, PREF-03, PREF-04
**Resequenced**: Moved from Phase 7 - scheduling engine needs goal data models
**Plans**: TBD

Plans:
- [ ] 05-01: Goals list and form
- [ ] 05-02: Preferences system (global and per-goal)
- [ ] 05-03: Preferences panel UI

### Phase 6: Scheduling Engine
**Goal**: Deterministic constraint satisfaction algorithm with scoring
**Depends on**: Phase 5 (needs goal data models)
**Research**: Likely (constraint satisfaction algorithms, scheduling heuristics)
**Research topics**: CSP algorithms for scheduling, soft constraint scoring functions, infeasibility detection
**Requirements**: SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05
**Resequenced**: Moved from Phase 5 - depends on goals/preferences data models
**Plans**: TBD

Plans:
- [ ] 06-01: Core CSP algorithm with hard constraints
- [ ] 06-02: Soft constraint scoring system
- [ ] 06-03: Infeasibility handling and flexibility classification

### Phase 7: Calendar UI
**Goal**: Interactive week view with drag/drop and event management
**Depends on**: Phase 6
**Research**: Unlikely (standard calendar UI patterns)
**Requirements**: CAL-01, CAL-02, CAL-03, CAL-04, CAL-05, CAL-06, CAL-07, CAL-08
**Plans**: TBD

Plans:
- [ ] 07-01: Week view grid (7 columns, 15-min slots)
- [ ] 07-02: Event display (locked vs AI-generated styling)
- [ ] 07-03: Drag/drop and completion logging

### Phase 8: LLM Gateway
**Goal**: Server-side AI endpoints with secure key handling and logging
**Depends on**: Phase 7
**Research**: Likely (Anthropic Claude API, prompt engineering)
**Research topics**: Claude API patterns, token budget enforcement, secure logging practices
**Requirements**: LLM-01, LLM-02, LLM-03, LLM-04, LLM-05, LLM-06, LLM-07, SEC-04, SEC-15, SEC-16
**Plans**: TBD

Plans:
- [ ] 08-01: LLM infrastructure (server-only, key protection)
- [ ] 08-02: Parse and clarify endpoints
- [ ] 08-03: Explain and confirm endpoints
- [ ] 08-04: Cost control (budgets, caching, dedup)

### Phase 9: Settings & Billing
**Goal**: Settings page and Stripe integration with webhook security
**Depends on**: Phase 8
**Research**: Likely (Stripe API, webhook patterns)
**Research topics**: Stripe checkout setup intents, webhook signature verification, subscription lifecycle
**Requirements**: SETT-01, BILL-01, BILL-02, BILL-03, BILL-04, BILL-05, SEC-12
**Plans**: TBD

Plans:
- [ ] 09-01: Settings page (constraints, account)
- [ ] 09-02: Stripe integration with webhook verification
- [ ] 09-03: Usage tracking and trial logic

### Phase 10: Landing Page & Launch
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
| 3. Database & RLS | 0/3 | Planned | - |
| 4. Onboarding Flow | 0/3 | Not started | - |
| 5. Goals & Preferences | 0/3 | Not started | - |
| 6. Scheduling Engine | 0/3 | Not started | - |
| 7. Calendar UI | 0/3 | Not started | - |
| 8. LLM Gateway | 0/4 | Not started | - |
| 9. Settings & Billing | 0/3 | Not started | - |
| 10. Landing Page & Launch | 0/4 | Not started | - |

## Resequencing Notes (2026-01-16)

**Changes made:**
1. **Phase 3 expanded** to include security hardening (headers, rate limiting) - originally in Phase 10
2. **Goals & Preferences moved earlier** (5 → 5) - scheduling engine needs goal data models
3. **Scheduling Engine moved later** (5 → 6) - depends on goals data being defined first
4. **Phase 10 renamed** "Hardening & Launch" → "Landing Page & Launch" - basic hardening now in Phase 3

**Rationale:**
- Security hardening should happen early, not at launch
- Goals data models must exist before scheduling can use them
- Landing page still appropriate at end (feature complete for demo)
