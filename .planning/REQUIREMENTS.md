# Requirements: TimeLi

**Defined:** 2026-01-15
**Core Value:** Generate a weekly schedule from goals and constraints that respects all hard constraints and explains its reasoning.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [x] **FOUN-01**: Project scaffolded with Next.js 15 App Router + TypeScript + Tailwind + shadcn/ui
- [x] **FOUN-02**: Supabase project connected with database schema defined
- [x] **FOUN-03**: Environment configuration and deployment setup on Vercel

### Authentication

- [x] **AUTH-01**: User can sign up with email and password
- [x] **AUTH-02**: User can sign up with Google OAuth (optional path)
- [x] **AUTH-03**: User session persists across browser refresh
- [x] **AUTH-04**: User can log out

### Onboarding

- [x] **ONBD-01**: User enters timezone selection
- [x] **ONBD-02**: User defines sleep window (start/end times)
- [x] **ONBD-03**: User defines meal times
- [x] **ONBD-04**: User defines transition buffer preferences
- [x] **ONBD-05**: User defines commute times
- [x] **ONBD-06**: User enters fixed commitments (locked events)
- [x] **ONBD-07**: User enters goals via chat interface (LLM-assisted)
- [x] **ONBD-08**: Onboarding restarts if dropped mid-flow

### Scheduling Engine

- [x] **SCHED-01**: Deterministic constraint satisfaction algorithm implemented
- [x] **SCHED-02**: Hard constraints enforced (locked events, sleep, meals, no overlaps, buffers, 15-min grid)
- [x] **SCHED-03**: Soft constraints applied with scoring (energy alignment, consistency, chunking, spacing, deadlines, stability)
- [x] **SCHED-04**: Infeasibility detected with trade-off options presented (never silently drop goals)
- [x] **SCHED-05**: Flexibility classification assigned (Low/Med/High based on alternatives)

### Calendar View

- [x] **CAL-01**: Week view with 7 columns (Mon-Sun) and 15-min grid
- [x] **CAL-02**: Week selector (current to +4 weeks)
- [x] **CAL-03**: Default visible range 6 AM - 11 PM
- [x] **CAL-04**: Locked events displayed (gray, not draggable, lock icon)
- [x] **CAL-05**: AI-generated events displayed (color-coded, draggable, pinnable, rationale badge, flexibility dot)
- [x] **CAL-06**: Drag/drop with 15-min snap (no LLM call, DB update only)
- [x] **CAL-07**: Recalibrate button with local vs global confirmation
- [x] **CAL-08**: Completion logging (completed/skipped/partial + notes)

### Goals Management

- [x] **GOAL-01**: Goals list view with add/edit/delete/archive actions
- [x] **GOAL-02**: Goal form with title, duration, frequency, intensity, deadline fields

### Preferences System

- [x] **PREF-01**: Global preferences (avoid times, preferred windows, energy peak, intensity limits)
- [x] **PREF-02**: Per-goal preferences (preferred windows, excluded days, session lengths, dependencies)
- [x] **PREF-03**: Preference types: explicit (user-set), confirmed (pattern + approval), settings-based
- [x] **PREF-04**: Preferences panel with view/edit/delete/toggle/reset/export

### LLM Gateway

- [x] **LLM-01**: Server-side only implementation (no API keys or prompts on client)
- [x] **LLM-02**: Parse goal endpoint (natural language -> structured goal)
- [x] **LLM-03**: Clarify endpoint (ask follow-up questions when needed)
- [x] **LLM-04**: Explain rationale endpoint (top 3 factors -> <=240 char explanation)
- [x] **LLM-05**: Confirm preference endpoint (pattern -> confirmation question)
- [x] **LLM-06**: Parse change request endpoint (natural language -> intent + params)
- [x] **LLM-07**: Token budgets, caching, deduplication for cost control

### Settings & Billing

- [x] **SETT-01**: Settings page (baseline constraints, account, subscription)
- [x] **BILL-01**: Stripe integration ($15/month after 1-month trial)
- [x] **BILL-02**: Payment method capture (Stripe setup intent, no charge until trial ends)
- [x] **BILL-03**: Trial starts on first schedule generation
- [x] **BILL-04**: Usage tracking (200 generations + 500 recalibrations per month)
- [x] **BILL-05**: Usage indicator displayed in UI

### Weekly Review

- [x] **REV-01**: Completion summary and productive times displayed
- [x] **REV-02**: Preference suggestions from patterns presented
- [x] **REV-03**: Notes section available

### Landing Page

- [x] **LAND-01**: Minimal landing page with Linear/Cal.com aesthetic

### Security & Compliance

- [x] **SEC-01**: Environment variable management (all API keys in `.env.local`, never in code)
- [x] **SEC-02**: Secrets scanning (pre-commit hooks to prevent API key commits)
- [x] **SEC-03**: Environment variable validation on app startup (fail fast if missing)
- [x] **SEC-04**: API key exposure audit (grep for hardcoded keys, check build outputs)
- [x] **SEC-05**: Supabase RLS policies tested and verified for all tables
- [x] **SEC-06**: Input sanitization beyond Zod (XSS prevention, SQL injection protection)
- [x] **SEC-07**: Security headers (CSP, HSTS, X-Frame-Options, etc.)
- [x] **SEC-08**: CSRF protection for state-changing operations
- [x] **SEC-09**: Dependency vulnerability scanning (npm audit, Dependabot)
- [x] **SEC-10**: Rate limiting implementation and testing
- [x] **SEC-11**: Authentication security (session management, token expiration, refresh tokens)
- [x] **SEC-12**: Stripe webhook signature verification
- [x] **SEC-13**: Data encryption at rest (Supabase handles, verify settings)
- [x] **SEC-14**: HTTPS enforcement (Vercel handles, verify redirects)
- [x] **SEC-15**: Error handling that doesn't leak sensitive info
- [x] **SEC-16**: Logging that excludes API keys and sensitive user data

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Calendar Integration

- **SYNC-01**: Google Calendar sync
- **SYNC-02**: Apple Calendar sync
- **SYNC-03**: Outlook Calendar sync

### Mobile

- **MOBL-01**: Push notifications
- **MOBL-02**: Native mobile apps (iOS/Android)

### Advanced Features

- **ADV-01**: Team/shared calendars
- **ADV-02**: Gamification elements
- **ADV-03**: Advanced analytics dashboard
- **ADV-04**: Multi-week planning (>1 week ahead)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Calendar integration (Google/Apple/Outlook) | Complexity, MVP focus |
| Push notifications | Adds mobile complexity |
| Native mobile apps | Web-responsive only for MVP |
| Team features | Solo user focus |
| Gamification | Unnecessary for core value |
| Advanced analytics | Ship basic first |
| Multi-week planning (>1 week ahead) | Keep scope tight |

## Traceability

Which phases cover which requirements. Updated by create-roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUN-01 | Phase 1 | Complete |
| FOUN-02 | Phase 1 | Complete |
| FOUN-03 | Phase 1 | Complete |
| SEC-01 | Phase 1 | Complete |
| SEC-02 | Phase 1 | Complete |
| SEC-03 | Phase 1 | Complete |
| SEC-09 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Complete |
| AUTH-03 | Phase 2 | Complete |
| AUTH-04 | Phase 2 | Complete |
| SEC-11 | Phase 2 | Complete |
| SEC-05 | Phase 3 | Complete |
| SEC-06 | Phase 3 | Complete |
| ONBD-01 | Phase 4 | Complete |
| ONBD-02 | Phase 4 | Complete |
| ONBD-03 | Phase 4 | Complete |
| ONBD-04 | Phase 4 | Complete |
| ONBD-05 | Phase 4 | Complete |
| ONBD-06 | Phase 4 | Complete |
| ONBD-07 | Phase 4 | Complete |
| ONBD-08 | Phase 4 | Complete |
| SCHED-01 | Phase 5 | Complete |
| SCHED-02 | Phase 5 | Complete |
| SCHED-03 | Phase 5 | Complete |
| SCHED-04 | Phase 5 | Complete |
| SCHED-05 | Phase 5 | Complete |
| CAL-01 | Phase 6 | Complete |
| CAL-02 | Phase 6 | Complete |
| CAL-03 | Phase 6 | Complete |
| CAL-04 | Phase 6 | Complete |
| CAL-05 | Phase 6 | Complete |
| CAL-06 | Phase 6 | Complete |
| CAL-07 | Phase 6 | Complete |
| CAL-08 | Phase 6 | Complete |
| GOAL-01 | Phase 7 | Complete |
| GOAL-02 | Phase 7 | Complete |
| PREF-01 | Phase 7 | Complete |
| PREF-02 | Phase 7 | Complete |
| PREF-03 | Phase 7 | Complete |
| PREF-04 | Phase 7 | Complete |
| LLM-01 | Phase 8 | Complete |
| LLM-02 | Phase 8 | Complete |
| LLM-03 | Phase 8 | Complete |
| LLM-04 | Phase 8 | Complete |
| LLM-05 | Phase 8 | Complete |
| LLM-06 | Phase 8 | Complete |
| LLM-07 | Phase 8 | Complete |
| SEC-04 | Phase 8 | Complete |
| SEC-15 | Phase 8 | Complete |
| SEC-16 | Phase 8 | Complete |
| SETT-01 | Phase 9 | Complete |
| BILL-01 | Phase 9 | Complete |
| BILL-02 | Phase 9 | Complete |
| BILL-03 | Phase 9 | Complete |
| BILL-04 | Phase 9 | Complete |
| BILL-05 | Phase 9 | Complete |
| SEC-12 | Phase 9 | Complete |
| LAND-01 | Phase 10 | Complete |
| REV-01 | Phase 10 | Complete |
| REV-02 | Phase 10 | Complete |
| REV-03 | Phase 10 | Complete |
| SEC-07 | Phase 10 | Complete |
| SEC-08 | Phase 10 | Complete |
| SEC-10 | Phase 10 | Complete |
| SEC-13 | Phase 10 | Complete |
| SEC-14 | Phase 10 | Complete |

**Coverage:**
- v1 requirements: 59 total
- Completed: 59
- Remaining: 0

**Final Status:** All v1 requirements complete. Project ready for launch.

---
*Requirements defined: 2026-01-15*
*Last updated: 2026-01-25 after Phase 10 completion*
