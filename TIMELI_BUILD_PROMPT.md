# TimeLi MVP - Complete Build Specification

**Use the Claude Code frontend-design plugin to avoid generic AI aesthetics.**

I want to build **TimeLi**, an AI-assisted weekly scheduling app for students and early-career professionals that turns fixed commitments and goals into an explainable, learnable weekly schedule using a deterministic scheduling algorithm.

---

## EXECUTIVE SUMMARY

**What:** Weekly scheduling app that combines user constraints, locked commitments, and goals into an AI-explained schedule
**Who:** Students & early-career strivers (ages 18-28)
**How:** Deterministic constraint satisfaction algorithm + LLM for parsing/explaining only
**Price:** 1-month free trial, then $15/month
**Limits:** 200 generations + 500 recalibrations per month

**Core Principle:** No silent assumptions. Everything requires explicit user confirmation.

---

## TECH STACK

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL + Auth + RLS)
- **Payments:** Stripe
- **LLM:** Anthropic Claude API (server-side only)
- **Hosting:** Vercel
- **Background Jobs:** Vercel Cron
- **Validation:** Zod schemas
- **Date/Time:** date-fns

**CRITICAL:** NO n8n, Zapier, Make, or external orchestrators. All logic in codebase.

---

## PRODUCT DEFINITION

### Target User
Students and early-career strivers who want structure but need flexibility as life evolves.

### Value Proposition
**Before:** Scattered tasks, ad-hoc planning, forgetting goals, energy crashes, guilt from unrealistic expectations

**After:** Clear weekly plan that respects constraints, spaces work appropriately, builds habits, explains reasoning, improves via confirmed preferences

### MVP Scope
- Weekly planning (Mon-Sun, 15-min grid)
- Manual commitment entry with lock toggle
- Chat-based goal intake
- Deterministic scheduling with AI explanations
- Preference memory (explicit/confirmed only)
- Drag/drop, pin, recalibrate
- Completion logging
- 1-month trial → $15/month subscription

### NOT in MVP
- Calendar integration (Google/Apple/Outlook)
- Push notifications
- Native mobile apps (web-responsive only)
- Team features
- Gamification
- Advanced analytics
- Multi-week planning (>1 week ahead)

---

## USER FLOWS

### 1. Landing Page
- Hero: "Turn your goals into a weekly plan that actually works"
- How it works: Setup → Goals → Schedule
- CTA: "Start Free Trial"
- Design: Minimal, clean (Linear/Cal.com aesthetic)

### 2. Signup
- Email/password (Supabase Auth)
- Optional: Google OAuth
- Require payment method (Stripe setup intent, no charge)
- Trial starts on first schedule generation

### 3. Onboarding Wizard (7 steps)

**Step 1: Timezone**
- Auto-detect, allow override
- "We detected you're in [timezone]. Is this correct?"

**Step 2: Sleep Window**
- Suggestion: "Most people sleep 11 PM - 7 AM. Does this work?"
- [Yes] or [Customize] with time pickers
- Validation: 6-10 hours

**Step 3: Meals**
- "How many meals per day?" [1] [2] [3] [4] [5]
- For each meal: suggest time windows
  - Breakfast: 7-9 AM
  - Lunch: 12-2 PM
  - Dinner: 6-8 PM
- [Yes] or [Customize]

**Step 4: Transition Buffer**
- "How much buffer time between activities?"
- Default: 15 minutes
- Explanation: Prevents back-to-back scheduling

**Step 5: Commute (Optional)**
- "Do you have a regular commute?"
- [No] or [Yes + duration input]

**Step 6: Fixed Commitments**
- Mini calendar (Mon-Sun, 15-min grid)
- Click slot → add commitment
- Title, start/end time, recurring option
- Lock icon auto-enabled
- At least 1 commitment OR "I have no fixed commitments" checkbox

**Step 7: Goals (Chat)**
- "What do you want to accomplish this week?"
- Chat interface for natural language input
- LLM parses goals, asks clarifying questions
- When schedulable: "Ready to see your schedule?"
- Generate → redirect to calendar

### 4. Main App

**Layout:**
- Top nav: Logo, Calendar, Goals, Preferences, Settings
- Usage indicator: "142/200 generations • 45/500 recalibrations"
- User menu: Profile, Billing, Logout

**Calendar View (`/app/calendar`)**

Week Selector:
- [< Prev] [Week of Jan 13-19] [Next >]
- Current week to +4 weeks ahead

Calendar Grid:
- 7 columns (Mon-Sun)
- 15-min time slots
- Default hours: 6 AM - 11 PM (expandable to 24h)

Event Blocks:

*Locked Events:*
- Gray background, lock icon
- NOT draggable
- Click to view/delete (with confirmation)

*AI-Generated Events:*
- Color-coded by goal
- Shows title, time, rationale badge, flexibility dot (Low/Med/High), pin icon
- Draggable (15-min snap, no overlaps)
- Drag → update DB, no LLM call
- Pin → preserve in recalibrations

Recalibrate Button (bottom-right):
- **Local:** Re-optimize this week, preserve pins
- **Global:** Update preferences, regenerate
- Confirmation dialog for global

Completion Logging:
- Checkbox per event
- Modal: [Completed] [Skipped] [Partial] + optional notes

**Goals View (`/app/goals`)**
- List of active goals with edit/delete
- Add Goal: form with title, duration, frequency, intensity, deadline
- Archived tab

**Preferences View (`/app/preferences`)**
- Tabs: Global | Per-Goal
- Cards showing preference + source + toggle
- Add/Edit/Delete preferences
- [Reset All Preferences] button
- [Export as JSON]

**Settings (`/app/settings`)**
- Baseline Constraints (edit onboarding values)
- Account (email, password, timezone, delete account)
- Subscription & Billing (Stripe portal)
- Notifications (stubbed)

**Weekly Review (`/app/weekly-review`)**
- Summary: completion %, productive times
- Preference suggestions from patterns
- Notes section

---

## DETERMINISTIC SCHEDULING ENGINE

### Core Principle
**LLM does NOT schedule.** LLM only parses language, asks questions, generates rationales, confirms preferences.

Scheduling = deterministic constraint satisfaction + scoring algorithm.

### Hard Constraints (Must Satisfy)
1. Locked events are immutable
2. No events during sleep window
3. No events during meal windows
4. No overlaps
5. Transition buffers enforced (15 min between non-consecutive blocks)
6. Commute buffers (if configured)
7. Goal frequency met (e.g., 3x/week = exactly 3 instances)
8. 15-minute grid alignment

### Soft Constraints (Scored & Optimized)
1. Energy alignment: high-intensity → mornings (+20pts)
2. Consistency: habits at same time each day (+15pts)
3. Chunking: group similar intensity (+10pts)
4. Spacing: avoid back-to-back intense (-20pts if violated)
5. Preference memory: match windows (+30pts), avoid times (-50pts)
6. Deadline proximity (+25pts if <3 days)
7. Stability: preserve previous placement (+15pts), pinned (+1000pts)

### Scoring Function
```typescript
function scoreSlot(goal, timeslot, context): number {
  let score = 100;
  
  // Hard constraints → -Infinity
  if (overlapsLockedEvent(timeslot)) return -Infinity;
  if (overlapsSleep(timeslot)) return -Infinity;
  if (overlapsMeal(timeslot)) return -Infinity;
  if (violatesTransitionBuffer(timeslot)) return -Infinity;
  
  // Soft constraints → adjust score
  if (matchesEnergyProfile(goal.intensity, timeslot)) score += 20;
  if (isConsistentWithPreviousWeek(goal, timeslot)) score += 15;
  if (matchesPreferredWindow(goal, timeslot)) score += 30;
  if (violatesAvoidedTime(goal, timeslot)) score -= 50;
  if (backToBackIntense(timeslot)) score -= 20;
  if (goodSpacing(timeslot)) score += 10;
  if (deadlineProximity(goal, timeslot)) score += 25;
  if (isPinned(goal, timeslot)) score += 1000;
  
  return score;
}
```

### Placement Algorithm
1. Sort goals: Locked → Habits → Deadlines → Flexible
2. For each goal, find best-scoring slot
3. Place goal, mark slot unavailable
4. Find fallback (second-best slot)
5. Classify flexibility (Low/Med/High based on alternatives)

### Infeasibility Handling
If no feasible slot:
1. Detect conflict
2. Generate trade-off options:
   - "Reduce [Goal X] from 10h to 6h"
   - "Schedule [Goal Y] 2x instead of 3x"
   - "Remove [lowest priority goal]"
3. Present to user as multiple-choice
4. **Never silently drop goals**

### Rationale Generation (LLM After Placement)
1. Identify top 3 scoring factors
2. Call `/api/llm/explain-rationale`
3. LLM generates ≤240 char explanation
4. Example: "Scheduled here for consistent morning routine and optimal focus energy"

### Recalibration
**Local:**
- Preserve locked + pinned
- Re-optimize unpinned
- 0-5 LLM calls (only if new placements need rationales)

**Global:**
- Detect changes (user drags, pins)
- Ask confirmation: "Remember this?"
- Update preferences
- Regenerate with new preferences
- 1-5 LLM calls

---

## PREFERENCE MEMORY SYSTEM

### Philosophy
Preferences are **explicit or confirmed only**. No silent learning.

### Global Preferences
- `avoid_after_time`: e.g., no work after 8 PM
- `avoid_before_time`: e.g., no work before 9 AM
- `preferred_work_window`: e.g., 9 AM - 5 PM
- `max_intense_blocks_per_day`: default 3
- `min_break_between_intense`: default 30 min
- `consistency_strength`: low/medium/high
- `energy_peak_window`: e.g., 9 AM - 12 PM

### Per-Goal Preferences
- `prefer_window`: e.g., gym 6-8 AM Mon/Wed/Fri
- `excluded_days`: e.g., no gym on Sundays
- `min_session_length`: e.g., gym min 45 min
- `max_session_length`: e.g., study max 2 hours
- `must_be_consecutive`: for multi-block goals
- `preferred_before_goal_id`: scheduling dependencies
- `preferred_after_goal_id`

### Capture Rules
1. **Explicit:** User sets in Preferences panel (strength: 8)
2. **Settings:** From onboarding/settings (strength: 10)
3. **Confirmed:** Pattern detected → ask user → if yes, save (strength: 6)

**Detection Triggers:**
- Drag same goal to same time 3+ times
- Pin goal at same time 2+ weeks
- Consistently skip goal at certain time

**Confirmation Flow:**
- System detects pattern
- Show modal: "I noticed you prefer gym at 6 AM. Remember this?"
- [No] [Yes]

### Precedence (Highest to Lowest)
1. Pinned blocks (1000)
2. Per-goal preferences (6-8)
3. Global preferences (5-7)
4. Settings constraints (10)
5. Smart defaults (3)

### Preferences Panel UX
- View all (global + per-goal)
- Edit inline
- Delete with confirmation
- Toggle active/inactive
- Reset all (keeps settings, removes rest)
- Export JSON

---

## LLM GATEWAY DESIGN

### Architecture
**Server-only.** No API keys, prompts, or responses touch client.

### Endpoints

**1. Parse Goal** (`POST /api/llm/parse-goal`)
- Input: message + context (goals, constraints)
- Output: structured goals with confidence + missing_fields
- Max tokens: Input 500, Output 200
- Cache: 5 min

**2. Clarify** (`POST /api/llm/clarify`)
- Input: goal_draft + missing_fields
- Output: question + suggested_options
- Max tokens: Input 300, Output 150

**3. Explain Rationale** (`POST /api/llm/explain-rationale`)
- Input: goal + timeslot + scoring_factors
- Output: rationale (≤240 chars)
- Max tokens: Input 400, Output 100
- Cache: 1 hour

**4. Confirm Preference** (`POST /api/llm/confirm-preference`)
- Input: pattern_detected
- Output: confirmation_question
- Max tokens: Input 300, Output 100

**5. Parse Change Request** (`POST /api/llm/parse-change-request`)
- Input: message + current_schedule
- Output: intent + new_params
- Max tokens: Input 600, Output 150

### Token Budgets
| Tier | Daily Input | Daily Output | Req/Hour |
|------|------------|--------------|----------|
| Trial | 100k | 20k | 20 |
| Pro | 100k | 20k | 20 |

**Per-session:** 3k input, 500 output (30-min timeout)

### Cost Minimization
1. **Compact snapshots** (not full chat history) → 90% reduction
2. **Output caps** enforced at API level
3. **Deduplication** (5-min cache) → 30% reduction
4. **Idempotency** (prevent double-charges)
5. **Template caching** (common clarifications) → 50% reduction

### Regeneration Rules (Critical)

**Zero LLM Calls:**
- Drag/drop event
- Pin/unpin
- Toggle lock
- Mark complete/skip
- Local recalibrate (0-5 calls only for new rationales)

**1 LLM Call Max:**
- Natural language change ("Move gym to mornings")
  1. Parse intent (1 call)
  2. Deterministic scheduling
  3. Done

**Forbidden:**
- Multiple LLM calls per user action
- Calling LLM to "explain" drag/drop
- Calling LLM for deterministic ops

### Abuse Prevention
- Rate limiting (IP + user)
- Budget enforcement (daily caps)
- Step-down mode (form input when quota exceeded)
- Anomaly detection (rapid requests, token spikes)
- Kill switch (`LLM_ENABLED=false`)

### Security
- API keys in env vars only, never logged
- Input validation (max 500 chars, sanitize HTML)
- Output validation (Zod schemas, treat as untrusted)
- Prompt injection defense (delimiters)
- No code execution from LLM

---

## DATABASE SCHEMA

```sql
-- USER PROFILES
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONSTRAINTS
CREATE TABLE user_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  sleep_start TIME NOT NULL,
  sleep_end TIME NOT NULL,
  meals_per_day INT NOT NULL CHECK (meals_per_day BETWEEN 1 AND 5),
  meal_windows JSONB NOT NULL,
  transition_buffer_minutes INT NOT NULL DEFAULT 15,
  commute_buffer_minutes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- GOALS
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (LENGTH(title) <= 100),
  description TEXT CHECK (LENGTH(description) <= 500),
  duration_minutes INT NOT NULL CHECK (duration_minutes >= 15 AND duration_minutes <= 480),
  frequency_per_week INT NOT NULL CHECK (frequency_per_week BETWEEN 1 AND 7),
  intensity_level TEXT NOT NULL CHECK (intensity_level IN ('low', 'medium', 'high')),
  deadline TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_goals_user_active ON goals(user_id, is_active) WHERE is_active = TRUE;

-- EVENTS
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (LENGTH(title) <= 100),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_locked BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  rationale TEXT CHECK (LENGTH(rationale) <= 240),
  flexibility TEXT CHECK (flexibility IN ('low', 'medium', 'high')),
  fallback_slot TIMESTAMPTZ,
  week_start_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);
CREATE INDEX idx_events_user_week ON events(user_id, week_start_date);

-- COMPLETION LOGS
CREATE TABLE completion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('completed', 'skipped', 'partial')),
  notes TEXT CHECK (LENGTH(notes) <= 500),
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- PREFERENCES
CREATE TABLE preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  strength INT NOT NULL DEFAULT 5 CHECK (strength BETWEEN 1 AND 10),
  source TEXT NOT NULL CHECK (source IN ('explicit', 'confirmed', 'settings')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LLM USAGE
CREATE TABLE user_llm_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  input_tokens_used INT DEFAULT 0,
  output_tokens_used INT DEFAULT 0,
  requests_count INT DEFAULT 0,
  UNIQUE(user_id, date)
);

-- SCHEDULE CACHE
CREATE TABLE schedule_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,
  generated_schedule JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(user_id, cache_key)
);

-- USAGE TRACKING
CREATE TABLE user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  schedule_generations_used INT DEFAULT 0,
  recalibrations_used INT DEFAULT 0,
  UNIQUE(user_id, month_year)
);

-- SUBSCRIPTIONS
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'canceled', 'past_due')),
  plan TEXT NOT NULL CHECK (plan IN ('trial', 'pro')),
  trial_ends_at TIMESTAMPTZ,
  trial_used BOOLEAN DEFAULT FALSE,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### Row Level Security (RLS)
Enable RLS on all tables. Users can only access their own data:

```sql
CREATE POLICY "Users can manage own data" ON table_name FOR ALL USING (auth.uid() = user_id);
```

---

## API ENDPOINTS

### Auth
- `POST /api/auth/signup` - Email/password signup
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/session` - Get current session

### Onboarding
- `POST /api/onboarding/constraints` - Save sleep, meals, buffers
- `POST /api/onboarding/locked-events` - Add fixed commitments
- `GET /api/onboarding/status` - Check completion

### Goals
- `POST /api/goals` - Create goal
- `GET /api/goals` - List goals
- `PATCH /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal

### Events
- `GET /api/events?week_start=YYYY-MM-DD` - Get week's events
- `POST /api/events` - Add locked event
- `PATCH /api/events/:id` - Drag/drop, pin/unpin
- `DELETE /api/events/:id` - Delete event

### Scheduling
- `POST /api/schedule/generate` - Generate week
- `POST /api/schedule/recalibrate` - Local or global recalibration
- `POST /api/schedule/resolve-infeasibility` - Handle conflicts

### Completions
- `POST /api/completions` - Log outcome
- `GET /api/completions?week_start=YYYY-MM-DD` - Get logs

### Preferences
- `GET /api/preferences` - List all
- `POST /api/preferences` - Add preference
- `PATCH /api/preferences/:id` - Update
- `DELETE /api/preferences/:id` - Delete
- `POST /api/preferences/reset` - Clear all (except settings)
- `GET /api/preferences/export` - Export JSON

### Usage & Billing
- `GET /api/usage/current` - Monthly usage
- `GET /api/billing/portal` - Stripe portal URL

### LLM Gateway (Internal)
- `POST /api/llm/parse-goal`
- `POST /api/llm/clarify`
- `POST /api/llm/explain-rationale`
- `POST /api/llm/confirm-preference`
- `POST /api/llm/parse-change-request`

---

## SECURITY REQUIREMENTS (Acceptance Criteria)

### 1. Rate Limiting
- ✅ Per-IP: 100 req/hour (unauthenticated)
- ✅ Per-user: 20 LLM req/hour
- ✅ Stricter on LLM endpoints (10-50/hour per endpoint)
- ✅ 429 status with Retry-After header

### 2. Input Validation
- ✅ Zod schemas on all endpoints
- ✅ Reject unexpected fields (strict mode)
- ✅ Sanitize text (DOMPurify, no HTML/scripts)
- ✅ Max lengths enforced (title 100, description 500, notes 500)

### 3. API Key Handling
- ✅ Env vars only, never in code/DB/client
- ✅ Redacted in logs (sk-ant-***...last4)
- ✅ Rotation support (primary/secondary)

### 4. Auth & Authorization
- ✅ All endpoints require session (except signup/login)
- ✅ Supabase Auth with secure cookies
- ✅ Session expiry: 7 days
- ✅ Cookie flags: HttpOnly, Secure, SameSite=Lax
- ✅ RLS on all tables

### 5. CORS & CSRF
- ✅ CORS allowlist (app domain only, no wildcard)
- ✅ CSRF protection via SameSite cookies

### 6. Supply Chain
- ✅ Lockfiles committed
- ✅ Dependency scanning (Dependabot/Snyk)
- ✅ Regular security updates

### 7. Environment Separation
- ✅ Separate: dev, staging, production
- ✅ Separate Supabase projects
- ✅ Separate Stripe keys (test/live)

### 8. Session Management
- ✅ Session expiry (7 days)
- ✅ Revocation (logout)
- ✅ No perpetual sessions

### 9. Business Logic
- ✅ Verify resource ownership before modify
- ✅ Brute force prevention (5 login/15min)
- ✅ Credit-drain prevention (LLM budgets)
- ✅ Atomic usage tracking
- ✅ Idempotency keys

### 10. LLM Gateway
- ✅ Token budgets + caps
- ✅ Anomaly detection
- ✅ Kill switch (LLM_ENABLED)
- ✅ Prompt injection defense
- ✅ Output validation (strict schemas)
- ✅ No code execution from LLM

---

## UI DESIGN

**Aesthetic:** Minimal, clean (Linear/Cal.com style)
**Colors:** Blue primary, slate grays
**Typography:** Inter or similar sans-serif
**Spacing:** Ample whitespace, smooth transitions

**Assistant Tone:**
- Warm and friendly (not robotic)
- Encouraging without being cheesy
- Non-judgmental
- Specific and helpful

**Examples:**
- ✅ "I noticed you prefer gym at 6 AM. Should I remember this?"
- ❌ "Based on your preferences, it seems you like morning workouts."

**Responsive:**
- Desktop: Full sidebar, multi-column
- Tablet: Collapsible sidebar
- Mobile: Bottom nav, stacked views

**Accessibility:**
- ARIA labels
- Keyboard navigation
- Focus indicators
- WCAG AA contrast (4.5:1)

---

## ENVIRONMENT VARIABLES

**Public (Client):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`

**Private (Server):**
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_API_KEY_PRIMARY`
- `ANTHROPIC_API_KEY_SECONDARY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `LLM_ENABLED` (true/false)
- `CRON_SECRET`

---

## PERFORMANCE TARGETS

- Landing page: <1s
- Calendar page: <1.5s
- Schedule generation: <3s (incl. LLM)
- Drag/drop: <200ms
- LLM endpoints: <2s (P95)

---

## LAUNCH CHECKLIST

**Pre-Launch:**
- [ ] All security requirements implemented
- [ ] RLS policies enabled + tested
- [ ] Rate limiting active
- [ ] LLM kill switch tested
- [ ] Stripe webhooks configured
- [ ] Env vars set in Vercel (production)
- [ ] Database migrations run
- [ ] Manual testing completed
- [ ] Error tracking configured
- [ ] Domain + SSL active
- [ ] CORS allowlist set

**Launch Day:**
- [ ] Deploy to production
- [ ] Test signup → onboarding → schedule
- [ ] Monitor errors (first 2 hours)
- [ ] Check LLM usage

**Post-Launch (Week 1):**
- [ ] Monitor onboarding completion rate
- [ ] Track conversion (trial signups)
- [ ] Gather user feedback
- [ ] Verify no security incidents
- [ ] Review LLM costs

---

## SUCCESS METRICS (Month 1)

- 100 signups
- 60% onboarding completion
- 40% activation (first schedule)
- 20% conversion (trial → paid)
- <2% churn
- $0.50 LLM cost per active user

---

## ACCEPTANCE CRITERIA

The MVP is complete when:
1. All core flows work (signup → onboarding → schedule → recalibration)
2. All security requirements pass testing
3. Performance targets met (P95 < stated limits)
4. No critical bugs in manual testing
5. Trial signup + Stripe integration functional
6. LLM costs under budget ($50/day for first 100 users)

---

**END OF BUILD PROMPT**

This specification is complete and ready for implementation. Use the Claude Code frontend-design plugin to ensure a polished, non-generic UI.