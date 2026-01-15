# TimeLi

## What This Is

An AI-assisted weekly scheduling app for students and early-career professionals (ages 18-28) that turns fixed commitments and goals into an explainable, learnable weekly schedule. Uses a deterministic constraint satisfaction algorithm for scheduling, with LLM only for parsing natural language, asking clarifying questions, and generating explanations.

## Core Value

Generate a weekly schedule from goals and constraints that respects all hard constraints and explains its reasoning. If everything else fails, this must work.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Core Scheduling Engine**
- [ ] Deterministic constraint satisfaction algorithm with scoring function
- [ ] Hard constraints: locked events, sleep window, meals, no overlaps, transition buffers, 15-min grid
- [ ] Soft constraints: energy alignment, consistency, chunking, spacing, preference memory, deadlines, stability
- [ ] Infeasibility handling with trade-off options (never silently drop goals)
- [ ] Flexibility classification (Low/Med/High based on alternatives)

**User Flows**
- [ ] Landing page (minimal, Linear/Cal.com aesthetic)
- [ ] Email/password signup with optional Google OAuth
- [ ] Payment method capture (Stripe setup intent, no charge until trial ends)
- [ ] 7-step onboarding wizard (timezone, sleep, meals, buffer, commute, commitments, goals chat)
- [ ] Trial starts on first schedule generation

**Main App**
- [ ] Calendar view with week selector (current to +4 weeks)
- [ ] 15-min grid, 7 columns (Mon-Sun), 6 AM - 11 PM default
- [ ] Locked events (gray, not draggable, lock icon)
- [ ] AI-generated events (color-coded, draggable, pinnable, rationale badge, flexibility dot)
- [ ] Drag/drop with 15-min snap (no LLM call, just DB update)
- [ ] Recalibrate button (local vs global with confirmation)
- [ ] Completion logging (completed/skipped/partial + notes)

**Goals Management**
- [ ] Goals view with add/edit/delete/archive
- [ ] Form input: title, duration, frequency, intensity, deadline

**Preferences System**
- [ ] Global preferences (avoid times, preferred windows, energy peak, intensity limits)
- [ ] Per-goal preferences (preferred windows, excluded days, session lengths, dependencies)
- [ ] Explicit (user-set), confirmed (pattern detected + user approved), settings-based
- [ ] Preferences panel with view/edit/delete/toggle/reset/export

**LLM Gateway**
- [ ] Server-side only (no API keys/prompts on client)
- [ ] Parse goal endpoint (natural language → structured goal)
- [ ] Clarify endpoint (ask follow-up questions)
- [ ] Explain rationale endpoint (top 3 factors → ≤240 char explanation)
- [ ] Confirm preference endpoint (pattern → confirmation question)
- [ ] Parse change request endpoint (natural language → intent + params)
- [ ] Token budgets, caching, deduplication for cost control

**Settings & Billing**
- [ ] Settings page (baseline constraints, account, subscription)
- [ ] Stripe integration ($15/month after 1-month trial)
- [ ] Usage tracking (200 generations + 500 recalibrations per month)
- [ ] Usage indicator in UI

**Weekly Review**
- [ ] Completion summary and productive times
- [ ] Preference suggestions from patterns
- [ ] Notes section

### Out of Scope

- Calendar integration (Google/Apple/Outlook) — complexity, MVP focus
- Push notifications — adds mobile complexity
- Native mobile apps — web-responsive only for MVP
- Team features — solo user focus
- Gamification — unnecessary for core value
- Advanced analytics — ship basic first
- Multi-week planning (>1 week ahead) — keep scope tight

## Context

**Target Users:** Students and early-career strivers who want structure but need flexibility as life evolves.

**Value Proposition:**
- Before: Scattered tasks, ad-hoc planning, forgetting goals, energy crashes, guilt from unrealistic expectations
- After: Clear weekly plan that respects constraints, spaces work appropriately, builds habits, explains reasoning, improves via confirmed preferences

**Core Principle:** No silent assumptions. Everything explainable is acceptable; only truly hidden assumptions need user confirmation.

**Architecture Decision:** LLM does NOT schedule. Scheduling is deterministic constraint satisfaction + scoring. LLM only parses language, asks questions, generates rationales, confirms preferences. This keeps costs sustainable and behavior predictable.

**Cost Sustainability:** Quality product with sustainable LLM costs. Deterministic engine does heavy lifting. Cost minimization via compact snapshots (not full chat history), output caps, deduplication (5-min cache), template caching.

## Constraints

- **Tech Stack**: Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + Supabase + Stripe + Anthropic Claude API + Vercel — specified in PRD
- **No External Orchestrators**: No n8n, Zapier, Make — all logic in codebase
- **LLM Budget**: Token budgets enforced (100k input/20k output daily per tier, 3k/500 per session)
- **Performance**: Landing <1s, Calendar <1.5s, Schedule gen <3s, Drag/drop <200ms, LLM endpoints <2s P95
- **Security**: RLS on all tables, rate limiting, input validation (Zod), API keys server-only, CORS allowlist

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Deterministic scheduling, LLM for parsing/explaining only | Predictable behavior, sustainable costs, explainable results | — Pending |
| Supabase for auth + database | Integrated solution, RLS built-in, good DX | — Pending |
| 15-minute grid granularity | Balance between flexibility and complexity | — Pending |
| Onboarding restarts if dropped | Simpler implementation, preferences may change anyway | — Pending |
| Longer goal intake conversations OK | Prioritize schedule quality over LLM cost optimization initially | — Pending |
| Explainable = no confirmation needed | Only truly silent assumptions require user confirmation | — Pending |

---
*Last updated: 2026-01-15 after initialization*
