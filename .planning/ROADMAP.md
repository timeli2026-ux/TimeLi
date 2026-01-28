# Roadmap: TimeLi

## Overview

Build an AI-assisted weekly scheduling app with security baked in from day one. Start with secure foundation (env vars, secrets scanning), add auth with proper session security, establish RLS policies before any data flows, then build features (onboarding, scheduling engine, calendar UI, goals, LLM gateway, billing) on this secure base. Finish with landing page and final audit.

## Domain Expertise

None

## Milestones

- ✅ **v1.0 MVP** - Phases 1-10 (shipped 2026-01-25)
- 🚧 **v2.0 Student Daily Coach** - Phases 11-19 (target: end of February 2026)
  - Core insight: Students don't need a perfect schedule. They need a daily coach that tells them what to do NOW while ensuring they don't sacrifice their whole life for school.

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
- [x] **Phase 9: Settings & Billing** - Stripe integration with webhook verification
- [x] **Phase 10: Hardening & Launch** - Landing page, weekly review, final audit
- [x] **Phase 11: Database & Models** - courses/assignments tables, CRUD APIs, RLS
- [x] **Phase 12: Syllabus Import** - LLM parsing endpoint, hour estimation
- [ ] **Phase 13: Student Onboarding Foundation** - Basics, Classes, Assignments steps
- [ ] **Phase 14: Life Realms & Goals** - Realm selection, time allocation, quick goals
- [ ] **Phase 15: Today View (Daily Coach)** - The core experience: what to do today
- [ ] **Phase 16: Smart Scheduling Engine** - Deadline-aware + balance-aware generation
- [ ] **Phase 17: Week View & Calendar** - Visual schedule with realm color coding
- [ ] **Phase 18: Nudges & Insights** - Proactive warnings and weekly summaries
- [ ] **Phase 19: Polish & Ship** - Mobile, error handling, landing page, beta testing

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

### Phase 10: Hardening & Launch
**Goal**: Landing page, weekly review feature, and final security audit
**Depends on**: Phase 9
**Research**: Unlikely (standard patterns)
**Requirements**: LAND-01, REV-01, REV-02, REV-03, SEC-10, SEC-13, SEC-14

Plans:
- [x] 10-01: Landing page with waitlist
- [x] 10-02: Weekly review feature
- [x] 10-03: CSP header finalization
- [x] 10-04: Final security audit and verification

**Note**: Basic security headers and rate limiting moved to Phase 3 for early protection.

---

### 🚧 v2.0 Student Daily Coach (In Progress)

**Milestone Goal:** Transform TimeLi from a calendar app into a **daily coach** that tells students what to do today to stay on top of school AND live a balanced life.

**Core Value Proposition:**
> "I'll tell you what to do today to stay on top of school AND live a balanced life."

**Why This Works:**
1. **Low input, high value** - 3 min onboarding, daily value forever
2. **Reduces decision fatigue** - "Just tell me what to do"
3. **Prevents tunnel vision** - Can't neglect health while grinding for exams
4. **Adapts to chaos** - Missed something? It reschedules automatically
5. **Visible accountability** - Balance bar shows truth at a glance

**Target User:** College students who are overwhelmed, procrastinate, and want someone to just tell them what to focus on without sacrificing their health, career, or social life.

**Key Insight:** Students don't need a perfect semester schedule. They need:
- To never be surprised by deadlines
- To know what to do RIGHT NOW
- To not sacrifice their whole life for school

---

#### Phase 11: Database & Models ✅
**Goal**: Create courses and assignments tables with RLS, build CRUD APIs
**Depends on**: Phase 10 (v1.0 complete)
**Status**: Complete

Plans:
- [x] 11-01: Courses table and CRUD API
- [x] 11-02: Assignments table and CRUD API

#### Phase 12: Syllabus Import ✅
**Goal**: Build LLM-powered syllabus parsing endpoint that extracts assignments with due dates and estimated hours
**Depends on**: Phase 11
**Status**: Complete

Plans:
- [x] 12-01: Syllabus parser prompt and API endpoint

#### Phase 13: Student Onboarding Foundation
**Goal**: Build the base student onboarding wizard (Basics, Classes, Assignments)
**Depends on**: Phase 12
**Status**: In Progress (3/4 plans complete)

Plans:
- [x] 13-01: Student onboarding types, wizard shell, Basics + Classes steps
- [x] 13-02: Assignments step with syllabus import integration
- [x] 13-03: Generate step and completion API
- [ ] 13-04: Page routing and integration testing

---

#### Phase 14: Life Realms & Goals
**Goal**: Expand onboarding to capture what matters beyond academics - health, career, social, personal. Enable students to define how they want to spend their time across all life areas.

**Depends on**: Phase 13
**Research**: Unlikely (extending existing patterns)

**Why This Matters:** Students aren't just students. They're people trying to stay healthy, build careers, maintain relationships, and pursue passions. Without this, they'll sacrifice everything for school.

**Features:**

1. **Life Realms Selection** (Onboarding Step 4)
   - Present realm options: School (auto-included), Health, Career, Social, Personal/Hobbies
   - Student selects which realms matter to them (multi-select)
   - Each realm has an icon and color for visual consistency
   - School realm is always active (populated from classes/assignments)

2. **Time Allocation per Realm**
   - For each selected realm: "How many hours/week do you want to spend on this?"
   - Simple slider: 0-15 hours per week
   - Show visual breakdown: "That's about X hours per day"
   - Total hours validation: warn if total exceeds reasonable waking hours

3. **Quick Goals per Realm** (Onboarding Step 5)
   - For each realm, prompt: "Any specific goals for [Realm]?"
   - Pre-populated suggestions based on realm:
     - Health: "Exercise 3x/week", "8 hours sleep", "Meal prep Sundays"
     - Career: "Apply to 5 internships", "1 networking coffee/week", "Update resume"
     - Social: "Call family weekly", "One friend hangout/week", "Join a club"
     - Personal: "Read 30 min/day", "Practice guitar", "Side project time"
   - Students can select suggestions or add custom goals
   - Each goal has: title, frequency (times/week), duration (minutes/session)

4. **Database Updates**
   - Add `student_realms` table: user_id, realm_type, hours_per_week, color, active
   - Add `student_goals` table: user_id, realm_id, title, frequency_per_week, duration_minutes, active
   - Update completion API to save realms and goals

5. **Onboarding Flow Update**
   - Step 1: Basics (timezone, sleep) - EXISTS
   - Step 2: Classes (courses with schedules) - EXISTS
   - Step 3: Assignments (syllabus import or manual) - EXISTS
   - Step 4: Life Realms (select realms + hours/week) - NEW
   - Step 5: Goals (quick goals per realm) - NEW
   - Step 6: Review & Generate - UPDATED

Plans:
- [ ] 14-01: Database schema for student_realms and student_goals tables
- [ ] 14-02: Life Realms step UI (realm selection + time allocation)
- [ ] 14-03: Goals step UI (goal suggestions + custom goals)
- [ ] 14-04: Update completion API and onboarding flow integration

---

#### Phase 15: Today View (Daily Coach)
**Goal**: Build the core experience - a "Today" screen that tells students exactly what to focus on right now. This is the home screen and primary interaction point.

**Depends on**: Phase 14
**Research**: Unlikely (new UI, established patterns)

**Why This Matters:** This IS the product. Everything else supports this screen. Students open the app and immediately know what to do without thinking.

**Features:**

1. **Today Header**
   - Current date, greeting based on time of day
   - Quick stats: "X tasks today" or "Light day - enjoy it!"
   - Weather integration (optional, stretch goal)

2. **Classes Section**
   - Show today's classes as fixed blocks with times
   - Class name, location (if provided), time
   - Visual: colored by course color
   - Tapping expands to show: instructor, any assignments due for that class

3. **Urgent Section (Deadline-Aware)**
   - Assignments due within 7 days, sorted by urgency
   - Smart urgency calculation: (hours needed / hours until due)
   - Each item shows:
     - Assignment title + course
     - Due date ("Due in 3 days")
     - Estimated time remaining
     - Progress indicator (if partially done)
   - Primary CTA: [Start 1hr Session] - one tap to begin focused work
   - Secondary: [Mark Done] [Reschedule]

4. **Balance Section (Realm-Aware)**
   - If a realm is being neglected this week, surface a suggestion
   - Logic: if (hours_spent < hours_target * (day_of_week / 7) * 0.5), suggest it
   - Example: "You haven't exercised this week. 30 min workout?"
   - CTAs: [Schedule It] [Skip This Week] [Already Did It]
   - Rotate through neglected realms, don't overwhelm

5. **Weekly Balance Bar**
   - Horizontal bar at bottom showing time spent per realm this week
   - Color-coded segments: School (blue), Health (green), Career (yellow), etc.
   - Tapping expands to show: target vs actual for each realm
   - Visual feedback: realm turns red if severely neglected

6. **Quick Actions**
   - Floating action button or bottom bar
   - "Log time" - quickly log time spent on a realm
   - "Add task" - add a one-off task
   - "I'm free" - ask the system what to do with unexpected free time

7. **Empty/Light Day State**
   - If no urgent tasks: "You're on top of things! Here are some suggestions..."
   - Suggest realm goals that are behind
   - Or: "Take a break, you've earned it" if everything is on track

8. **Data Requirements**
   - API: GET /api/today - returns classes, urgent assignments, balance status, suggestions
   - Track: time spent per realm per day (for balance calculation)
   - Store: user interactions (skipped, completed, rescheduled)

Plans:
- [ ] 15-01: Today View page structure and header component
- [ ] 15-02: Classes section with today's schedule
- [ ] 15-03: Urgent section with deadline-aware assignment list
- [ ] 15-04: Balance section with realm suggestions
- [ ] 15-05: Weekly balance bar component
- [ ] 15-06: Today API endpoint and data aggregation

---

#### Phase 16: Smart Scheduling Engine
**Goal**: Build the intelligence that generates study sessions, realm activities, and adapts when plans change. This powers the "what should I do" recommendations.

**Depends on**: Phase 15
**Research**: Likely (deadline-backward scheduling, balance algorithms)
**Research Topics**: Spaced repetition for study scheduling, time-boxing techniques, adaptive rescheduling

**Why This Matters:** The engine is the brain. It needs to be smart about deadlines (academic survival) AND balance (life quality). It must adapt to reality, not expect perfection.

**Features:**

1. **Deadline-Backward Study Scheduling**
   - For each assignment, calculate study sessions needed
   - Estimation heuristic based on assignment type:
     - Exam: estimated_hours * 1.5 (buffer for review)
     - Paper: estimated_hours * 1.2 (buffer for editing)
     - Homework: estimated_hours (as-is)
     - Project: estimated_hours * 1.3 (buffer for integration)
   - Schedule sessions backward from due date
   - Apply spaced practice: prefer multiple shorter sessions over cramming
   - Minimum 2 days buffer before due date for final review

2. **Study Session Constraints**
   - Don't schedule during classes
   - Don't schedule during sleep hours
   - Prefer scheduling during high-energy times (configurable: morning/afternoon/evening person)
   - Max 3 hours continuous study, then force break
   - Don't schedule same subject back-to-back days (unless deadline forces it)

3. **Realm Activity Scheduling**
   - For each realm goal, calculate weekly time needed
   - Distribute throughout the week based on frequency
   - Health goals: prefer morning or evening (common gym times)
   - Social goals: prefer evenings and weekends
   - Career goals: prefer weekday afternoons
   - Respect user's indicated preferences if provided

4. **Balance Algorithm**
   - Calculate ideal distribution: hours_per_realm / total_hours * 100
   - Track actual distribution daily
   - Generate "balance score" (0-100): how close to ideal
   - If a realm falls below 50% of target by mid-week, flag for Today View
   - Never sacrifice School realm for others (academic survival first)

5. **Adaptive Rescheduling**
   - When user skips a session: auto-propose next available slot
   - When user completes early: ask "Want to get ahead on something else?"
   - When new assignment added: recalculate and show impact ("This will be a busy week")
   - When deadline changes: automatically adjust all related sessions

6. **Conflict Resolution**
   - Priority order: Sleep > Classes > Exams > Other Assignments > Realm Goals
   - When conflicts exist: surface to user with options
   - "You have 3 exams next week. Health goals will be reduced. OK?"
   - Allow user to override: "No, I need my gym time"

7. **Buffer & Flexibility**
   - Never schedule more than 80% of available time
   - Leave 20% for unexpected tasks, social opportunities, rest
   - Weekends: even more buffer unless exam week

8. **Data Model Updates**
   - `scheduled_sessions` table: id, user_id, type (study/realm), related_id (assignment/goal), scheduled_start, scheduled_end, status (pending/completed/skipped/rescheduled), actual_duration
   - `daily_time_tracking` table: user_id, date, realm_type, minutes_spent
   - `scheduling_preferences` table: user_id, preferred_study_time, max_daily_study_hours, weekend_availability

Plans:
- [ ] 16-01: Database schema for scheduled_sessions and time tracking
- [ ] 16-02: Deadline-backward study session generator
- [ ] 16-03: Realm activity scheduler with distribution logic
- [ ] 16-04: Balance algorithm and weekly calculations
- [ ] 16-05: Adaptive rescheduling logic (skip/complete handlers)
- [ ] 16-06: Schedule generation API endpoint

---

#### Phase 17: Week View & Calendar
**Goal**: Provide a visual week view where students can see their schedule, understand their balance at a glance, and make adjustments via drag-and-drop.

**Depends on**: Phase 16
**Research**: Unlikely (extending existing calendar)

**Why This Matters:** Today View is the daily driver, but students need to see the week ahead to feel in control. The visual balance feedback reinforces good behavior.

**Features:**

1. **Week Grid (Existing, Enhanced)**
   - 7-day view with time slots
   - Current day highlighted
   - Current time indicator
   - Navigate between weeks (limit: current week to +4 weeks)

2. **Event Types & Colors**
   - Classes: solid color (course color), fixed/locked
   - Study sessions: hatched/striped pattern (course color), moveable
   - Realm activities: solid color (realm color), moveable
   - Due dates: badge/marker on the day (not a time block)

3. **Realm Color Coding**
   - School: Blue (#3B82F6)
   - Health: Green (#22C55E)
   - Career: Yellow/Gold (#EAB308)
   - Social: Purple (#A855F7)
   - Personal: Orange (#F97316)
   - Consistent across all views

4. **Daily Balance Indicator**
   - Small pie chart or bar at the top of each day column
   - Shows realm distribution for that day
   - Helps visualize: "Monday is all school, need to balance later"

5. **Weekly Summary Panel**
   - Sidebar or collapsible panel showing:
     - Hours per realm (target vs actual)
     - Upcoming due dates (next 7 days)
     - Balance score for the week
     - "At risk" warnings (assignments that might not get done)

6. **Drag-and-Drop**
   - Study sessions and realm activities can be dragged to reschedule
   - Classes are locked (visual indicator)
   - Snap to 15-minute increments
   - Validation: warn if moving causes conflict or deadline risk

7. **Quick Actions on Events**
   - Click to expand: see details, mark complete, skip, edit duration
   - Right-click menu: reschedule, delete, edit
   - Swipe gestures on mobile (stretch goal)

8. **Due Date Markers**
   - Visual marker (flag/badge) on days with due dates
   - Hover/tap shows: assignment name, course, time remaining
   - Color intensity based on urgency

Plans:
- [ ] 17-01: Enhanced week grid with realm color coding
- [ ] 17-02: Event type styling (classes vs study vs realm)
- [ ] 17-03: Daily balance indicators
- [ ] 17-04: Weekly summary panel
- [ ] 17-05: Due date markers and hover details

---

#### Phase 18: Nudges & Insights
**Goal**: Proactive notifications and insights that help students stay on track without constant app checking. The app reaches out when it matters.

**Depends on**: Phase 17
**Research**: Unlikely (notification patterns established)

**Why This Matters:** Students won't check the app constantly. The app needs to surface critical information at the right time. This is the difference between a tool they use and a tool they rely on.

**Features:**

1. **Deadline Warnings**
   - 7 days before: "Heads up: [Assignment] due in a week"
   - 3 days before: "⚠️ [Assignment] due in 3 days. You have X hours of study scheduled."
   - 1 day before: "🚨 [Assignment] due tomorrow. Are you ready?"
   - Day of: "📅 [Assignment] due today by [time]"
   - Configurable: user can adjust warning thresholds

2. **Balance Nudges**
   - Mid-week check: "You've spent 0 hours on Health this week. Quick workout today?"
   - End-of-week: "Career goal behind this week. Catch up this weekend?"
   - Positive reinforcement: "Great week for balance! You hit all your realm targets."

3. **Smart Suggestions**
   - Unexpected free time: "Your 2pm class was cancelled. Study for Thursday's exam?"
   - Ahead of schedule: "You finished your essay early! Take tonight off?"
   - Falling behind: "You're behind on CS101. Extra session tomorrow morning?"

4. **Weekly Summary (Sunday Evening)**
   - Email or in-app notification
   - Hours spent per realm vs target
   - Assignments completed vs due
   - Balance score with trend (↑↓→)
   - Preview of next week: "Busy week ahead - 2 exams"

5. **Daily Briefing (Morning)**
   - Optional morning notification
   - "Good morning! Today: 2 classes, 1 study session, gym at 5pm"
   - One-tap to open Today View

6. **Streak & Momentum**
   - Track consecutive days of balance (all realms addressed)
   - "🔥 5-day streak! Keep it up."
   - Don't be annoying: max 2-3 notifications per day

7. **Notification Preferences**
   - Allow users to configure:
     - Notification channels: push, email, in-app only
     - Quiet hours (probably during sleep)
     - Which nudge types they want
   - Sensible defaults: deadline warnings ON, balance nudges ON, daily briefing OFF

8. **Insights Dashboard (Stretch)**
   - Trends over time: "You're studying 20% more than last month"
   - Realm balance history: see how balance changes over weeks
   - Productivity patterns: "You complete more tasks in the morning"

Plans:
- [ ] 18-01: Notification infrastructure and preferences
- [ ] 18-02: Deadline warning system
- [ ] 18-03: Balance nudge logic and delivery
- [ ] 18-04: Weekly summary generation and email
- [ ] 18-05: Daily briefing (optional)

---

#### Phase 19: Polish & Ship
**Goal**: Final polish, cleanup, and preparation for launch. Remove friction, ensure reliability, update marketing.

**Depends on**: Phase 18
**Research**: Unlikely (cleanup work)

**Why This Matters:** The difference between a prototype and a product people love is polish. Every rough edge erodes trust.

**Features:**

1. **Navigation Simplification**
   - Primary nav: Today, Week, Assignments, Settings
   - Remove or hide: old Goals page, Life Realms page (data captured in onboarding), Chat (defer to v2.1)
   - Clean, minimal sidebar

2. **Mobile Responsiveness**
   - Today View: must work perfectly on mobile (primary use case)
   - Week View: horizontal scroll on mobile, or switch to list view
   - Touch-friendly: larger tap targets, swipe gestures
   - Test on iPhone and Android devices

3. **Loading & Error States**
   - Skeleton loaders for all data-dependent views
   - Friendly error messages: "Couldn't load your schedule. Tap to retry."
   - Offline handling: show cached data with "Last updated X minutes ago"

4. **Empty States**
   - No classes yet: "Add your first class to get started"
   - No assignments: "Looking good! No assignments due soon."
   - No goals: "Set some goals to live a balanced life"
   - Each empty state has clear CTA

5. **Onboarding Completion**
   - Celebration moment when onboarding completes
   - Quick tour of Today View (tooltip overlay)
   - "Your first week is planned. Here's what to focus on today."

6. **Performance Optimization**
   - Lazy load non-critical components
   - Optimize API calls (batch where possible)
   - Image optimization (if any)
   - Target: <2s load time for Today View

7. **Landing Page Update**
   - Update messaging: "Your daily coach for college"
   - Highlight: "Tell me your classes. I'll tell you what to do every day."
   - Add testimonials (after beta testing)
   - Clear CTA: "Get Started - Free"

8. **Deprecated Features**
   - Hide Stripe billing (free for MVP, monetize later)
   - Hide complex preference editing (use sensible defaults)
   - Hide chat assistant (cool but not core, revisit in v2.1)
   - Keep data/APIs intact for future reactivation

9. **Testing & QA**
   - Manual testing checklist for all flows
   - Fix critical bugs
   - Test with 5-10 real students (beta)
   - Iterate based on feedback

10. **Analytics Setup**
    - Track: onboarding completion rate, daily active users, feature usage
    - Track: balance scores over time (is the product working?)
    - Privacy-conscious: no PII in analytics

Plans:
- [ ] 19-01: Navigation cleanup and deprecated feature removal
- [ ] 19-02: Mobile responsiveness pass
- [ ] 19-03: Loading, error, and empty states
- [ ] 19-04: Landing page update
- [ ] 19-05: Beta testing and bug fixes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → ... → 10 → 11 → 12 → ... → 19

**Target Ship Date:** End of February 2026 (~4 weeks)

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Foundation & Security Base | v1.0 | 3/3 | Complete | 2026-01-15 |
| 2. Auth & Session Security | v1.0 | 3/3 | Complete | 2026-01-16 |
| 3. Database & RLS | v1.0 | 3/3 | Complete | 2026-01-16 |
| 4. Onboarding Flow | v1.0 | 3/3 | Complete | 2026-01-16 |
| 5. Scheduling Engine | v1.0 | 3/3 | Complete | 2026-01-17 |
| 6. Calendar UI | v1.0 | 6/6 | Complete | 2026-01-18 |
| 6.5. Schedule Chat | v1.0 | 3/3 | Complete | 2026-01-23 |
| 7. Goals & Preferences | v1.0 | 3/3 | Complete | 2026-01-23 |
| 8. LLM Gateway | v1.0 | 4/4 | Complete | 2026-01-23 |
| 9. Settings & Billing | v1.0 | 3/3 | Complete | 2026-01-24 |
| 10. Hardening & Launch | v1.0 | 4/4 | Complete | 2026-01-25 |
| 11. Database & Models | v2.0 | 2/2 | Complete | 2026-01-25 |
| 12. Syllabus Import | v2.0 | 1/1 | Complete | 2026-01-25 |
| 13. Student Onboarding Foundation | v2.0 | 3/4 | In progress | - |
| 14. Life Realms & Goals | v2.0 | 0/4 | Not started | - |
| 15. Today View (Daily Coach) | v2.0 | 0/6 | Not started | - |
| 16. Smart Scheduling Engine | v2.0 | 0/6 | Not started | - |
| 17. Week View & Calendar | v2.0 | 0/5 | Not started | - |
| 18. Nudges & Insights | v2.0 | 0/5 | Not started | - |
| 19. Polish & Ship | v2.0 | 0/5 | Not started | - |

**v2.0 Summary:**
- Total Plans: 31
- Completed: 6 (Phases 11-12 complete, Phase 13 partial)
- Remaining: 25

## Notes

**Phase 3 expanded** to include security hardening (headers, rate limiting) - originally in Phase 10. Security hardening should happen early, not at launch.

**Phase 4 (Onboarding)** now collects Actions & Habits with frequency data, providing the goal data needed for the scheduling engine. Goals & Preferences phase (7) is for editing these after onboarding.

---

## v2.0 Strategy Notes (2026-01-26)

### The Pivot: Calendar → Daily Coach

**Original v2.0 vision:** "Tell me your classes and deadlines. I'll plan your study schedule for the whole semester."

**Problem with that approach:**
1. Students won't follow a generated schedule - life is chaotic
2. A packed calendar increases stress, not reduces it
3. Semester-wide schedules become useless after day 2
4. No accountability loop when things are skipped

**New v2.0 vision:** "I'll tell you what to do today to stay on top of school AND live a balanced life."

**Why this works:**
1. **Reduces decision fatigue** - "Just tell me what to do right now"
2. **Adapts to chaos** - Missed something? Auto-reschedule
3. **Prevents tunnel vision** - Can't sacrifice health for exams
4. **Immediate value** - Don't need perfect data to be useful

### Key Product Decisions

1. **Today View is the product** - Everything else supports it
2. **Life Realms are core** - Not just school, but health, career, social, personal
3. **Balance is visible** - The balance bar creates accountability
4. **Proactive > Reactive** - The app reaches out when it matters
5. **Simple input, smart output** - 3 min onboarding, daily value forever

### What We're NOT Building (Yet)

- Semester-wide timeline view (overwhelming, not actionable)
- Complex preference editing (use smart defaults)
- Chat assistant (cool but not core)
- Payment/billing (free MVP first)
- Google Calendar sync (future v2.1)
- LMS integration (future v2.1)

### Success Metrics

1. **Onboarding completion rate** - Target: >70%
2. **Daily active users** - Do students come back every day?
3. **Balance scores over time** - Are students actually more balanced?
4. **Assignment completion rate** - Are they meeting deadlines?
5. **NPS/satisfaction** - Would they recommend to friends?

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Students don't input data | Syllabus import makes it one step |
| Too many notifications | Sensible defaults, easy to configure |
| Balance algorithm feels wrong | Start simple, iterate based on feedback |
| Students ignore the app | Morning briefing + deadline warnings |
| Scope creep | Strict phase boundaries, ship then iterate |
