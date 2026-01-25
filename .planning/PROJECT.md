# TimeLi

## Executive Summary

TimeLi is an AI-assisted weekly scheduling application that transforms fixed commitments and goals into an optimal, explainable weekly schedule. It combines a deterministic constraint satisfaction algorithm with cognitive science principles, while using LLM (Claude) only for natural language parsing, conversational refinement, and generating explanations.

**Target Users:** Students and early-career professionals (ages 18-28) who want structure but need flexibility as life evolves.

**Core Value:** Generate a weekly schedule that respects all hard constraints, optimizes for cognitive performance, and explains its reasoning. If everything else fails, this must work.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16.1.2, React 19, TypeScript 5, Tailwind CSS 4 |
| UI Components | Shadcn UI (Radix primitives), Recharts, Sonner |
| Backend | Next.js API Routes (serverless) |
| Database | Supabase (PostgreSQL + Auth) |
| Payments | Stripe |
| LLM | Anthropic Claude API |
| Deployment | Vercel |

---

## Architecture Principle

**LLM does NOT schedule.** Scheduling is deterministic constraint satisfaction + cognitive science scoring. LLM only:
- Parses natural language goals
- Enables conversational schedule refinement
- Generates explanations for scheduling decisions
- Confirms user preferences

This keeps costs sustainable, behavior predictable, and results explainable.

---

## Core Features

### 1. Schedule Generation Engine

**Location:** `src/lib/scheduling/engine.ts`

The scheduling algorithm uses backtracking constraint satisfaction with cognitive science-based scoring:

**Phase 1: Constraint Building**
- Sleep windows (with weekend variation support)
- Meal times (breakfast, lunch, dinner)
- Commute (morning/evening, weekdays only)
- Fixed commitments (user's locked events)

**Phase 2: Goal Scheduling**
- Anchored goals scheduled first (habit stacking)
- MRV (Most Restricted Variable) heuristic sorting
- Deadline priority boosting
- Backtracking CSP solver with scoring

**Cognitive Science Principles Implemented:**

| Principle | Implementation |
|-----------|----------------|
| Chronotype Alignment | Matches tasks to user's peak energy (early bird/night owl/intermediate) |
| Ultradian Rhythms | Respects 90-120 min focus cycles; max 90 min sessions |
| Spaced Practice | Spreads sessions across days for better retention |
| Habit Stacking | Anchors goals to fixed events (40% faster habit formation) |
| Decision Fatigue | Balances high cognitive load tasks across the day |
| Recovery Buffers | Intensity-based recovery time between demanding tasks |

**Flexibility Classification:**
Each scheduled event gets a flexibility level:
- **High:** Many alternative time slots available
- **Medium:** Some alternatives exist
- **Low:** Few or no alternatives

**Infeasibility Detection:**
When goals cannot fit, returns clear explanation of which goals conflict and why, with trade-off options.

---

### 2. Calendar Interface

**Location:** `src/app/(protected)/calendar/page.tsx`

**Features:**
- 7-day week view with 15-minute time slots
- 6 AM - 11 PM default view (configurable)
- Week navigation (current week to +4 weeks)
- Current time indicator

**Event Types:**
- **Locked events:** Gray, not draggable, lock icon (meals, commute, commitments)
- **Goal events:** Color-coded by realm, draggable, show rationale and flexibility
- **Simple events:** User-created events without realm tracking

**Interactions:**
- Drag-and-drop with 15-min snap (no LLM call, instant DB update)
- Click empty slot → Create new event dialog
- Click existing event → View details popover with Edit button
- Mark events as completed/skipped/partial with optional notes

**Sidebar Components:**
- Goal progress tracking
- Realm pie chart (time distribution)
- Schedule statistics (utilization %)

---

### 3. Conversational Schedule Refinement

**Location:** `src/components/calendar/chatbox.tsx`, `src/app/api/chat/route.ts`

**Features:**
- Natural language chat interface
- Multi-turn conversations per week (stored in DB)
- Automatic modification parsing and application
- Rate limited: 20 requests/minute

**Supported Commands (via natural language):**
- Move events: "Move gym to Tuesday evening"
- Delete events: "Remove the meditation session"
- Get explanations: "Why is deep work scheduled at 9am?"
- Store feedback: "I prefer mornings for creative tasks"

**How It Works:**
1. User sends message
2. System builds context with current schedule
3. Claude generates response + optional JSON modification block
4. Parser extracts modification directive
5. Modification applied to database
6. Clean response shown to user (JSON stripped)

---

### 4. Goal Management

**Location:** `src/app/(protected)/goals/page.tsx`

**Goal Properties:**
| Property | Description |
|----------|-------------|
| Title | What you want to do |
| Life Realm | Category (Health, Career, Relationships, etc.) |
| Hours per Week | Time commitment |
| Cognitive Load | High/Medium/Low (affects scheduling) |
| Requires Deep Work | Boolean for flow state protection |
| Intensity Level | 1-5 (affects recovery buffers) |
| Deadline | Optional with type: hard/soft/none |
| Anchor | Optional habit stacking (before/after fixed event) |
| Session Strategy | Minimum/preferred session duration |
| Excluded Days | Days to avoid scheduling this goal |
| Preferred Time | Morning/Afternoon/Evening/Any |

**Operations:**
- Create, edit, delete, archive goals
- Sort by realm, hours, deadline
- View active vs archived separately

---

### 5. Life Realms

**Location:** `src/app/api/realms/route.ts`

Life realms organize goals into meaningful categories:
- Health
- Career
- Relationships
- Learning
- Creativity
- Finance
- Personal
- Spiritual

Custom realms can be created. Each goal belongs to one realm. The pie chart shows time distribution across realms.

---

### 6. Weekly Review

**Location:** `src/app/(protected)/review/page.tsx`

**Analytics Provided:**
- Completion rates by realm
- Productive hours heat map (when you're most effective)
- Completion summary (completed/skipped/partial counts)
- Week-over-week comparison

**Notes Section:**
Weekly reflection notes saved for future reference.

---

### 7. User Preferences

**Location:** `src/app/(protected)/settings/preferences/page.tsx`

**Configurable Settings:**
| Setting | Description |
|---------|-------------|
| Timezone | User's local timezone |
| Chronotype | Early bird, Night owl, Intermediate |
| Sleep Schedule | Start/end time (weekday + weekend) |
| Meal Times | Breakfast, lunch, dinner start time and duration |
| Commute | Morning/evening start time and duration |
| Buffer Minutes | Default gap between events |

---

### 8. Onboarding Flow

**Location:** `src/app/(protected)/onboarding/page.tsx`

7-step wizard:
1. Timezone selection
2. Sleep schedule configuration
3. Meal times setup
4. Commute information
5. Fixed commitments entry
6. Life realms selection
7. Initial goals creation

Onboarding restarts if dropped mid-flow (simpler implementation, preferences may change anyway).

---

### 9. Authentication

**Providers:**
- Supabase Auth (email/password)
- Google OAuth (single sign-on)

**Security:**
- Server-side sessions via Supabase SSR
- Middleware guards protected routes
- Row Level Security (RLS) on all database tables
- Users can only access their own data

**Account Management:**
- Password change
- Account deletion (cascades all data)

---

### 10. Billing & Subscription

**Location:** `src/app/(protected)/settings/subscription/page.tsx`

**Pricing:** $15/month

**Trial:** 30 days free, starts on first schedule generation

**Subscription States:**
- `inactive` → No subscription
- `trialing` → 30-day trial active
- `active` → Paid subscription
- `past_due` → Payment failed
- `canceled` → User canceled

**Usage Limits per Billing Period:**
| Feature | Free | Pro |
|---------|------|-----|
| Schedule Generations | 1 | 10 |
| Recalibrations | 1 | 10 |
| LLM Requests | 10 | 50 |

**Stripe Integration:**
- Checkout session for subscription
- Customer portal for self-service
- Webhook handling for subscription events

---

## Database Schema

### Tables Overview

| Table | Purpose |
|-------|---------|
| `profiles` | User profile info, onboarding status |
| `user_preferences` | Timezone, sleep, meals, commute, chronotype |
| `fixed_commitments` | Locked events (meetings, classes) |
| `life_realms` | Goal categories |
| `user_goals` | Goals with scheduling metadata |
| `generated_schedules` | Weekly schedules as JSON |
| `schedule_completions` | Task completion tracking |
| `schedule_feedback` | Learned user preferences |
| `schedule_conversations` | Chat history per week |
| `api_usage` | Daily rate limiting |
| `subscriptions` | Stripe billing status |
| `usage_tracking` | Billing period limits |

### Key Relationships

```
profiles (1) ─── (1) user_preferences
profiles (1) ─── (n) fixed_commitments
profiles (1) ─── (n) life_realms
life_realms (1) ─── (n) user_goals
profiles (1) ─── (n) generated_schedules
generated_schedules (1) ─── (n) schedule_completions
profiles (1) ─── (n) schedule_feedback
profiles (1) ─── (n) schedule_conversations
profiles (1) ─── (1) subscriptions
profiles (1) ─── (1) usage_tracking
```

---

## API Endpoints

### Schedule Management
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/schedule/generate` | POST | Generate/regenerate schedule |
| `/api/schedule/[weekStart]` | GET | Fetch schedule for week |
| `/api/schedule/update` | POST | Update schedule events |
| `/api/schedule/create-event` | POST | Create new event |
| `/api/schedule/update-event` | POST | Update event |
| `/api/schedule/update-event` | DELETE | Delete event |
| `/api/schedule/complete` | POST | Mark event completion |

### Chat & LLM
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat` | POST | Conversational refinement |
| `/api/llm/parse-goal` | POST | Parse natural language goal |
| `/api/llm/explain` | POST | Get schedule rationale |
| `/api/llm/status` | GET | Check LLM availability |
| `/api/llm/usage` | GET | Get token usage stats |

### Goals & Realms
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/goals` | GET/POST | List/create goals |
| `/api/goals/[id]` | GET/PUT/DELETE | CRUD single goal |
| `/api/realms` | GET | List user's realms |

### User Settings
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/preferences` | GET/PUT | User preferences |
| `/api/account` | DELETE | Delete account |
| `/api/onboarding/complete` | POST | Mark onboarding done |

### Billing
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/billing/status` | GET | Subscription status |
| `/api/billing/create-checkout` | POST | Start checkout |
| `/api/billing/portal` | POST | Billing portal link |
| `/api/webhooks/stripe` | POST | Handle Stripe events |

### Analytics
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/review` | GET | Weekly review data |
| `/api/review/notes` | POST | Save weekly notes |
| `/api/usage` | GET | Current usage limits |

---

## File Structure

```
src/
├── app/
│   ├── (protected)/        # Auth-required pages
│   │   ├── calendar/       # Main schedule view
│   │   ├── goals/          # Goal management
│   │   ├── review/         # Weekly analytics
│   │   ├── settings/       # User settings
│   │   ├── onboarding/     # Setup wizard
│   │   └── dashboard/      # Welcome page
│   ├── api/                # API routes
│   ├── login/              # Auth pages
│   ├── signup/
│   └── ...
├── components/
│   ├── calendar/           # Calendar UI components
│   ├── goals/              # Goal components
│   ├── onboarding/         # Wizard steps
│   ├── review/             # Review components
│   └── ui/                 # Shadcn primitives
├── lib/
│   ├── scheduling/         # Core algorithm
│   │   ├── engine.ts       # Backtracking CSP solver
│   │   ├── constraints.ts  # Constraint checking
│   │   ├── scoring.ts      # Cognitive science scoring
│   │   ├── flexibility.ts  # Flexibility classification
│   │   ├── infeasibility.ts# Conflict detection
│   │   ├── rationale.ts    # Explanation generation
│   │   └── types.ts        # Type definitions
│   ├── llm/                # LLM integration
│   │   ├── router.ts       # Provider selection
│   │   ├── cache.ts        # Response caching
│   │   ├── token-budget.ts # Usage tracking
│   │   └── providers/      # Anthropic, Offline
│   ├── chat/               # Chat utilities
│   │   ├── modification-parser.ts
│   │   └── schedule-prompts.ts
│   ├── supabase/           # DB client
│   ├── stripe.ts           # Billing
│   └── services/           # Business logic
└── supabase/
    └── migrations/         # SQL schema
```

---

## Security Measures

| Measure | Implementation |
|---------|----------------|
| Authentication | Supabase Auth + Google OAuth |
| Authorization | Row Level Security on all tables |
| API Keys | Environment variables only, never in code |
| Rate Limiting | 20 req/min on chat endpoint |
| Input Validation | Zod schemas |
| Secret Scanning | Gitleaks pre-commit hook |
| CSRF Protection | Next.js built-in |
| Webhook Verification | Stripe signature validation |

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Landing page load | < 1s |
| Calendar page load | < 1.5s |
| Schedule generation | < 3s |
| Drag and drop | < 200ms |
| LLM endpoints | < 2s P95 |

---

## Key Business Logic

### Schedule Generation Request Flow
```
1. User clicks "Generate Schedule"
2. Check authentication
3. Check usage limits (reject if exceeded)
4. Start 30-day trial if first generation
5. Fetch: preferences, commitments, goals
6. Build constraint blocks
7. Create fixed events (meals, commute, commitments)
8. Schedule anchored goals (habit stacking)
9. Sort remaining goals by MRV heuristic
10. Apply deadline priority boost
11. Run backtracking CSP with cognitive scoring
12. Add flexibility classifications
13. Check for infeasibilities
14. Save to generated_schedules
15. Increment usage counters
16. Return schedule + stats + any unscheduled goals
```

### Chat Modification Flow
```
1. User sends chat message
2. Rate limit check (20/min)
3. Load current schedule context
4. Load conversation history
5. Build system prompt with schedule
6. Call Claude API
7. Parse response for JSON modification
8. If modification found:
   - Apply to database
   - Refresh schedule
9. Save conversation
10. Return clean text response
```

---

## Out of Scope (MVP)

- Calendar integration (Google/Apple/Outlook)
- Push notifications
- Native mobile apps (web-responsive only)
- Team features
- Gamification
- Advanced analytics
- Multi-week planning (>1 week ahead)

---

## Recent Changes (Phase 11)

### Bug Fixes
1. **Pie chart centering** - Changed legend to horizontal/bottom
2. **Chat response display** - Added fallback for empty LLM responses
3. **Feedback persistence** - Recalibrate feedback now stored in DB

### New Features
1. **Click to create events** - Click empty calendar slots to add events
2. **Event type selection** - Goal events (tracked) vs Simple events
3. **Recurring events** - Weekly recurrence with day selection
4. **Edit events** - Click Edit button in popover to modify
5. **Delete events** - Remove events with confirmation

---

## Success Metrics (To Track)

- Schedule generation success rate
- User retention (weekly active users)
- Completion rate (tasks completed vs scheduled)
- Chat usage (modifications per user per week)
- Subscription conversion (trial → paid)
- Churn rate

---

*Last updated: 2026-01-25 after Phase 11 implementation*
