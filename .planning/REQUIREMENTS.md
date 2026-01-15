# Requirements: TimeLi

**Defined:** 2026-01-15
**Core Value:** Generate a weekly schedule from goals and constraints that respects all hard constraints and explains its reasoning.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [ ] **FOUN-01**: Project scaffolded with Next.js 15 App Router + TypeScript + Tailwind + shadcn/ui
- [ ] **FOUN-02**: Supabase project connected with database schema defined
- [ ] **FOUN-03**: Environment configuration and deployment setup on Vercel

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password
- [ ] **AUTH-02**: User can sign up with Google OAuth (optional path)
- [ ] **AUTH-03**: User session persists across browser refresh
- [ ] **AUTH-04**: User can log out

### Onboarding

- [ ] **ONBD-01**: User enters timezone selection
- [ ] **ONBD-02**: User defines sleep window (start/end times)
- [ ] **ONBD-03**: User defines meal times
- [ ] **ONBD-04**: User defines transition buffer preferences
- [ ] **ONBD-05**: User defines commute times
- [ ] **ONBD-06**: User enters fixed commitments (locked events)
- [ ] **ONBD-07**: User enters goals via chat interface (LLM-assisted)
- [ ] **ONBD-08**: Onboarding restarts if dropped mid-flow

### Scheduling Engine

- [ ] **SCHED-01**: Deterministic constraint satisfaction algorithm implemented
- [ ] **SCHED-02**: Hard constraints enforced (locked events, sleep, meals, no overlaps, buffers, 15-min grid)
- [ ] **SCHED-03**: Soft constraints applied with scoring (energy alignment, consistency, chunking, spacing, deadlines, stability)
- [ ] **SCHED-04**: Infeasibility detected with trade-off options presented (never silently drop goals)
- [ ] **SCHED-05**: Flexibility classification assigned (Low/Med/High based on alternatives)

### Calendar View

- [ ] **CAL-01**: Week view with 7 columns (Mon-Sun) and 15-min grid
- [ ] **CAL-02**: Week selector (current to +4 weeks)
- [ ] **CAL-03**: Default visible range 6 AM - 11 PM
- [ ] **CAL-04**: Locked events displayed (gray, not draggable, lock icon)
- [ ] **CAL-05**: AI-generated events displayed (color-coded, draggable, pinnable, rationale badge, flexibility dot)
- [ ] **CAL-06**: Drag/drop with 15-min snap (no LLM call, DB update only)
- [ ] **CAL-07**: Recalibrate button with local vs global confirmation
- [ ] **CAL-08**: Completion logging (completed/skipped/partial + notes)

### Goals Management

- [ ] **GOAL-01**: Goals list view with add/edit/delete/archive actions
- [ ] **GOAL-02**: Goal form with title, duration, frequency, intensity, deadline fields

### Preferences System

- [ ] **PREF-01**: Global preferences (avoid times, preferred windows, energy peak, intensity limits)
- [ ] **PREF-02**: Per-goal preferences (preferred windows, excluded days, session lengths, dependencies)
- [ ] **PREF-03**: Preference types: explicit (user-set), confirmed (pattern + approval), settings-based
- [ ] **PREF-04**: Preferences panel with view/edit/delete/toggle/reset/export

### LLM Gateway

- [ ] **LLM-01**: Server-side only implementation (no API keys or prompts on client)
- [ ] **LLM-02**: Parse goal endpoint (natural language → structured goal)
- [ ] **LLM-03**: Clarify endpoint (ask follow-up questions when needed)
- [ ] **LLM-04**: Explain rationale endpoint (top 3 factors → ≤240 char explanation)
- [ ] **LLM-05**: Confirm preference endpoint (pattern → confirmation question)
- [ ] **LLM-06**: Parse change request endpoint (natural language → intent + params)
- [ ] **LLM-07**: Token budgets, caching, deduplication for cost control

### Settings & Billing

- [ ] **SETT-01**: Settings page (baseline constraints, account, subscription)
- [ ] **BILL-01**: Stripe integration ($15/month after 1-month trial)
- [ ] **BILL-02**: Payment method capture (Stripe setup intent, no charge until trial ends)
- [ ] **BILL-03**: Trial starts on first schedule generation
- [ ] **BILL-04**: Usage tracking (200 generations + 500 recalibrations per month)
- [ ] **BILL-05**: Usage indicator displayed in UI

### Weekly Review

- [ ] **REV-01**: Completion summary and productive times displayed
- [ ] **REV-02**: Preference suggestions from patterns presented
- [ ] **REV-03**: Notes section available

### Landing Page

- [ ] **LAND-01**: Minimal landing page with Linear/Cal.com aesthetic

### Security & Compliance

- [ ] **SEC-01**: Environment variable management (all API keys in `.env.local`, never in code)
- [ ] **SEC-02**: Secrets scanning (pre-commit hooks to prevent API key commits)
- [ ] **SEC-03**: Environment variable validation on app startup (fail fast if missing)
- [ ] **SEC-04**: API key exposure audit (grep for hardcoded keys, check build outputs)
- [ ] **SEC-05**: Supabase RLS policies tested and verified for all tables
- [ ] **SEC-06**: Input sanitization beyond Zod (XSS prevention, SQL injection protection)
- [ ] **SEC-07**: Security headers (CSP, HSTS, X-Frame-Options, etc.)
- [ ] **SEC-08**: CSRF protection for state-changing operations
- [ ] **SEC-09**: Dependency vulnerability scanning (npm audit, Dependabot)
- [ ] **SEC-10**: Rate limiting implementation and testing
- [ ] **SEC-11**: Authentication security (session management, token expiration, refresh tokens)
- [ ] **SEC-12**: Stripe webhook signature verification
- [ ] **SEC-13**: Data encryption at rest (Supabase handles, verify settings)
- [ ] **SEC-14**: HTTPS enforcement (Vercel handles, verify redirects)
- [ ] **SEC-15**: Error handling that doesn't leak sensitive info
- [ ] **SEC-16**: Logging that excludes API keys and sensitive user data

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
| FOUN-01 | Phase 1 | Pending |
| FOUN-02 | Phase 1 | Pending |
| FOUN-03 | Phase 1 | Pending |
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 1 | Pending |
| SEC-03 | Phase 1 | Pending |
| SEC-09 | Phase 1 | Pending |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| SEC-11 | Phase 2 | Pending |
| SEC-05 | Phase 3 | Pending |
| SEC-06 | Phase 3 | Pending |
| ONBD-01 | Phase 4 | Pending |
| ONBD-02 | Phase 4 | Pending |
| ONBD-03 | Phase 4 | Pending |
| ONBD-04 | Phase 4 | Pending |
| ONBD-05 | Phase 4 | Pending |
| ONBD-06 | Phase 4 | Pending |
| ONBD-07 | Phase 4 | Pending |
| ONBD-08 | Phase 4 | Pending |
| SCHED-01 | Phase 5 | Pending |
| SCHED-02 | Phase 5 | Pending |
| SCHED-03 | Phase 5 | Pending |
| SCHED-04 | Phase 5 | Pending |
| SCHED-05 | Phase 5 | Pending |
| CAL-01 | Phase 6 | Pending |
| CAL-02 | Phase 6 | Pending |
| CAL-03 | Phase 6 | Pending |
| CAL-04 | Phase 6 | Pending |
| CAL-05 | Phase 6 | Pending |
| CAL-06 | Phase 6 | Pending |
| CAL-07 | Phase 6 | Pending |
| CAL-08 | Phase 6 | Pending |
| GOAL-01 | Phase 7 | Pending |
| GOAL-02 | Phase 7 | Pending |
| PREF-01 | Phase 7 | Pending |
| PREF-02 | Phase 7 | Pending |
| PREF-03 | Phase 7 | Pending |
| PREF-04 | Phase 7 | Pending |
| LLM-01 | Phase 8 | Pending |
| LLM-02 | Phase 8 | Pending |
| LLM-03 | Phase 8 | Pending |
| LLM-04 | Phase 8 | Pending |
| LLM-05 | Phase 8 | Pending |
| LLM-06 | Phase 8 | Pending |
| LLM-07 | Phase 8 | Pending |
| SEC-04 | Phase 8 | Pending |
| SEC-15 | Phase 8 | Pending |
| SEC-16 | Phase 8 | Pending |
| SETT-01 | Phase 9 | Pending |
| BILL-01 | Phase 9 | Pending |
| BILL-02 | Phase 9 | Pending |
| BILL-03 | Phase 9 | Pending |
| BILL-04 | Phase 9 | Pending |
| BILL-05 | Phase 9 | Pending |
| SEC-12 | Phase 9 | Pending |
| LAND-01 | Phase 10 | Pending |
| REV-01 | Phase 10 | Pending |
| REV-02 | Phase 10 | Pending |
| REV-03 | Phase 10 | Pending |
| SEC-07 | Phase 10 | Pending |
| SEC-08 | Phase 10 | Pending |
| SEC-10 | Phase 10 | Pending |
| SEC-13 | Phase 10 | Pending |
| SEC-14 | Phase 10 | Pending |

**Coverage:**
- v1 requirements: 59 total
- Mapped to phases: 59
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-15*
*Last updated: 2026-01-15 after roadmap creation*
