# Plan 05-02 Summary: Soft Constraint Scoring System

## Status: Complete

## What Was Built

### 1. Cognitive Science-Backed Scoring System (`src/lib/scheduling/scoring.ts`)

Implemented 9 scoring functions based on research:

| Function | Research Basis | Purpose |
|----------|---------------|---------|
| `scoreUltradianAlignment` | Kleitman's BRAC | Match task cognitive load to energy windows |
| `scoreSpacedPractice` | Cepeda et al. | Distribute sessions for better retention |
| `scoreConsistency` | Fogg | Build habits through consistent timing |
| `scoreDeepWorkProtection` | Csikszentmihalyi, Newport | Protect uninterrupted focus blocks |
| `scoreDecisionFatigue` | Baumeister | Schedule demanding tasks when willpower is fresh |
| `scoreCommitmentStrength` | Rogers | Place goals in high follow-through windows |
| `scoreStability` | Habit research | Maintain week-over-week consistency |
| `scoreRealmBalance` | Life design | Balance time across life areas |
| `scoreDeadlineProximity` | Urgency | Schedule urgent goals early in week |

**Key Types:**
- `ScoringWeights` - Configurable weights for each factor
- `SlotScore` - Score with breakdown by factor
- `ScoringContext` - All data needed for scoring decisions

**Dynamic Weight Calculation:**
- Physical/fitness goals: Prioritize consistency and commitment
- Deep work goals: Prioritize focus protection and decision fatigue
- Hard deadline goals: Prioritize deadline proximity
- Regular goals: Balanced weights across all factors

### 2. Scoring Integration (`src/lib/scheduling/engine.ts`)

Updated backtracking solver to use scoring:

- Added `GenerateScheduleOptions` for custom weights and previous week schedule
- Created `ScoringContext` from scheduler input
- `findBestSlotWithScoring()` ranks all valid slots by cognitive science score
- Highest-scoring placements selected during backtracking

### 3. User-Facing Rationale Generator (`src/lib/scheduling/rationale.ts`)

Benefit-focused explanations for schedule placements:

**Design Philosophy:**
- Lead with BENEFIT, not science lecture
- Use "you" language - make it personal
- Primary rationale under 60 chars
- Deeper explanations optional on expansion
- Tone: "This app gets me" not "This app is lecturing me"

**Example Rationales:**
- "Scheduled when you're most focused"
- "Same time as usual - building your routine"
- "Right after your fixed event - habit stacking"
- "Spaced out for better retention"
- "Early in the day while willpower is high"
- "Uninterrupted block for deep focus"

**Functions:**
- `generateRationale()` - Full rationale for an event
- `generateRationalesForSchedule()` - Batch rationale generation
- `getSimpleRationale()` - Quick rationale without scoring context

### 4. Type Updates (`src/lib/scheduling/types.ts`)

Added `EventRationale` interface:
```typescript
interface EventRationale {
  primary: string      // Main reason (< 60 chars)
  secondary?: string   // Deeper explanation (< 120 chars)
  factors: string[]    // Top scoring factors
}
```

Extended `ScheduleEvent` with optional `rationale` field.

## Tests Created

**47 scoring tests** in `src/lib/scheduling/__tests__/scoring.test.ts`:

1. **Ultradian alignment** (6 tests)
   - Peak window scoring by cognitive load
   - Trough window scoring
   - Postprandial dip penalty

2. **Spaced practice** (4 tests)
   - First session scoring
   - Same-day penalty
   - Adjacent-day penalty
   - Optimal spacing reward

3. **Consistency** (3 tests)
   - Same time as existing sessions
   - Same slot as last week
   - No pattern baseline

4. **Deep work protection** (3 tests)
   - Non-deep-work goals
   - 2+ hour block scoring
   - Fragmented time penalty

5. **Decision fatigue** (4 tests)
   - Fresh willpower scoring
   - Multiple prior tasks penalty
   - Late afternoon penalty
   - Low cognitive load immunity

6. **Commitment strength** (4 tests)
   - Morning slot boost
   - Adjacent fixed event bonus
   - Late night penalty
   - Weekend penalty

7. **Stability** (4 tests)
   - Same slot as last week
   - Same day different time
   - Different day penalty
   - No history baseline

8. **Realm balance** (2 tests)
   - Over-represented realm penalty
   - Balanced realm scoring

9. **Deadline proximity** (4 tests)
   - Urgent deadline early week
   - Urgent deadline late week penalty
   - No deadline baseline
   - Distant deadline scoring

10. **Integration tests** (8 tests)
    - Combined scoring produces breakdown
    - Weights sum to 1.0
    - Slot ranking by score
    - Dynamic weights by goal type
    - Optimal placement selection
    - Chronotype-specific behavior

## Verification Results

- [x] `npx tsc --noEmit` - No type errors
- [x] `npm test -- --testPathPattern=scheduling` - 70 tests pass
- [x] `npm test -- --testPathPattern=scoring` - 47 tests pass
- [x] `npm run build` - Builds successfully
- [x] All 9 scoring functions produce correct scores
- [x] Dynamic weights adapt to goal type
- [x] Backtracking uses scoring to select best placements

## Files Modified

| File | Changes |
|------|---------|
| `src/lib/scheduling/scoring.ts` | NEW - 584 lines |
| `src/lib/scheduling/rationale.ts` | NEW - 507 lines |
| `src/lib/scheduling/engine.ts` | Updated - scoring integration |
| `src/lib/scheduling/types.ts` | Added EventRationale type |
| `src/lib/scheduling/__tests__/scoring.test.ts` | NEW - 47 tests |

## Commits

1. `feat(05-02): implement cognitive science scoring functions`
2. `feat(05-02): integrate scoring into backtracking solver`
3. `feat(05-02): create user-facing rationale generator`

## Architecture Decisions

1. **Scoring as separate module** - Keeps scoring logic independent of backtracking
2. **Dynamic weights by goal type** - Allows optimization for different goals
3. **Rationale templates** - Consistent, benefit-focused messaging
4. **SlotScore with breakdown** - Enables transparency for debugging and UI

## Next Steps (Plan 05-03)

Plan 05-03 will handle:
- Infeasibility detection
- Trade-off options when schedule is over-constrained
- Flexibility classification (Low/Med/High)

## Dependencies for Next Plans

- `scoreSlot()` and `rankSlots()` available for any slot evaluation
- `generateRationale()` ready for UI integration in Phase 6
- `ScoringWeights` can be customized per-user in future
