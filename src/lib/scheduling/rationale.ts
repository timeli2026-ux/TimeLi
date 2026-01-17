// User-facing rationale generator for schedule placements
// Phase 5: Scheduling Engine - Plan 02
// Design: Lead with BENEFIT, not science lecture. Tone: helpful assistant, not professor.

import {
  ScheduleEvent,
  GoalWithMetadata,
  timeToMinutes,
  isWeekend,
} from './types'

import {
  SlotScore,
  ScoringContext,
  ScoringWeights,
  getTopScoringFactors,
} from './scoring'

// =============================================================================
// RATIONALE TYPES
// =============================================================================

/**
 * Rationale for why an event was scheduled at a specific time
 */
export interface EventRationale {
  primary: string      // Main reason shown in UI (1 line, action-focused, <60 chars)
  secondary?: string   // Optional deeper explanation on hover/expand (<120 chars)
  factors: string[]    // Top 2-3 scoring factors that influenced placement
}

/**
 * A scoring factor with its name and score
 */
interface ScoringFactor {
  factor: keyof ScoringWeights
  score: number
}

// =============================================================================
// RATIONALE TEMPLATES
// Templates are benefit-focused, personal ("you"), and under 60 chars
// =============================================================================

const RATIONALE_TEMPLATES = {
  ultradianAlignment: {
    high: "Scheduled when you're most focused",
    medium: "Placed in a good energy window",
    low: "Light task for a natural energy dip"
  },

  spacedPractice: {
    optimal: "Spaced out for better retention",
    good: "Spread across your week",
    clustered: "Building momentum with back-to-back sessions"
  },

  consistency: {
    habitual: "Same time as usual \u2014 building your routine",
    establishing: "Creating a consistent time slot",
    varied: "Flexible timing this week"
  },

  deepWorkProtection: {
    protected: "Uninterrupted block for deep focus",
    adequate: "Enough time for focused work",
    fragmented: "Shorter session between commitments"
  },

  decisionFatigue: {
    fresh: "Early in the day while willpower is high",
    moderate: "Before decision fatigue kicks in",
    depleted: "Light task for later in the day"
  },

  commitmentStrength: {
    anchored: "Right after your {{anchorName}} \u2014 habit stacking",
    morning: "Morning slot for better follow-through",
    visible: "In a time you're likely to keep"
  },

  stability: {
    stable: "Same slot as last week \u2014 consistency builds habits",
    similar: "Close to your usual time",
    new: "Trying a new time this week"
  },

  realmBalance: {
    balanced: "Keeping your {{realmName}} goals on track",
    catching_up: "Making sure {{realmName}} gets attention",
    prominent: "Prioritizing {{realmName}} this week"
  },

  deadlineProximity: {
    urgent: "Deadline approaching \u2014 scheduled early",
    soon: "Getting ahead on this one",
    relaxed: "Plenty of time before deadline"
  }
}

// =============================================================================
// FACTOR DESCRIPTIONS (for detailed view)
// =============================================================================

/**
 * Get a short description for a factor shown in detailed view
 */
function factorToDescription(
  factor: ScoringFactor,
  context: ScoringContext
): string {
  const { score } = factor

  switch (factor.factor) {
    case 'ultradianAlignment':
      return `Energy match: ${score >= 80 ? 'optimal' : score >= 60 ? 'good' : 'acceptable'}`

    case 'spacedPractice':
      return `Session spacing: ${score >= 80 ? 'well distributed' : score >= 50 ? 'moderate' : 'clustered'}`

    case 'consistency':
      return `Routine strength: ${score >= 80 ? 'established' : 'building'}`

    case 'deepWorkProtection':
      if (!context.goal.requiresDeepWork) return 'Focus time: not required'
      return `Focus time: ${score >= 90 ? 'protected' : score >= 60 ? 'adequate' : 'limited'}`

    case 'decisionFatigue':
      return `Willpower: ${score >= 80 ? 'fresh' : score >= 50 ? 'moderate' : 'depleted'}`

    case 'commitmentStrength':
      return `Follow-through: ${score >= 70 ? 'high' : 'moderate'}`

    case 'stability':
      return `Week consistency: ${score >= 80 ? 'stable' : score >= 50 ? 'similar' : 'varied'}`

    case 'realmBalance':
      return `Life balance: ${score >= 70 ? 'balanced' : 'adjusting'}`

    case 'deadlineProximity':
      if (!context.goal.deadline) return 'No deadline'
      return `Urgency: ${score >= 80 ? 'time-sensitive' : score >= 50 ? 'upcoming' : 'flexible'}`

    default:
      return ''
  }
}

// =============================================================================
// PRIMARY RATIONALE GENERATION
// =============================================================================

/**
 * Generate the primary (main) rationale based on the highest scoring factor
 */
function generatePrimaryRationale(
  topFactor: ScoringFactor,
  event: ScheduleEvent,
  context: ScoringContext
): string {
  const { factor, score } = topFactor

  switch (factor) {
    case 'ultradianAlignment': {
      const templates = RATIONALE_TEMPLATES.ultradianAlignment
      if (context.goal.cognitiveLoad === 'high' && score >= 80) {
        return templates.high
      } else if (context.goal.cognitiveLoad === 'low' || score < 50) {
        return templates.low
      }
      return templates.medium
    }

    case 'spacedPractice': {
      const templates = RATIONALE_TEMPLATES.spacedPractice
      if (score >= 80) return templates.optimal
      if (score >= 50) return templates.good
      return templates.clustered
    }

    case 'consistency': {
      const templates = RATIONALE_TEMPLATES.consistency
      if (score >= 90) return templates.habitual
      if (score >= 60) return templates.establishing
      return templates.varied
    }

    case 'deepWorkProtection': {
      const templates = RATIONALE_TEMPLATES.deepWorkProtection
      if (score >= 90) return templates.protected
      if (score >= 60) return templates.adequate
      return templates.fragmented
    }

    case 'decisionFatigue': {
      const templates = RATIONALE_TEMPLATES.decisionFatigue
      if (score >= 80) return templates.fresh
      if (score >= 50) return templates.moderate
      return templates.depleted
    }

    case 'commitmentStrength': {
      const templates = RATIONALE_TEMPLATES.commitmentStrength
      if (event.isAnchoredSession) {
        const anchorName = findAnchorName(event, context)
        return templates.anchored.replace('{{anchorName}}', anchorName)
      }
      const startMinutes = timeToMinutes(event.slot.startTime)
      if (startMinutes >= 360 && startMinutes <= 600) { // 6:00-10:00
        return templates.morning
      }
      return templates.visible
    }

    case 'stability': {
      const templates = RATIONALE_TEMPLATES.stability
      if (score >= 90) return templates.stable
      if (score >= 60) return templates.similar
      return templates.new
    }

    case 'realmBalance': {
      const templates = RATIONALE_TEMPLATES.realmBalance
      const realmName = context.goal.realmId ? getRealmDisplayName(context.goal.realmId) : 'this area'
      if (score >= 70) return templates.balanced.replace('{{realmName}}', realmName)
      if (score >= 50) return templates.catching_up.replace('{{realmName}}', realmName)
      return templates.prominent.replace('{{realmName}}', realmName)
    }

    case 'deadlineProximity': {
      const templates = RATIONALE_TEMPLATES.deadlineProximity
      if (score >= 80) return templates.urgent
      if (score >= 50) return templates.soon
      return templates.relaxed
    }

    default:
      return "Scheduled at an optimal time"
  }
}

// =============================================================================
// SECONDARY RATIONALE GENERATION
// =============================================================================

/**
 * Generate a secondary explanation combining top factors
 * Kept under 120 chars, natural language
 */
function generateSecondaryRationale(
  topFactors: ScoringFactor[],
  context: ScoringContext
): string | undefined {
  if (topFactors.length < 2) return undefined

  const [first, second] = topFactors

  // Generate contextual combinations
  const phrases: string[] = []

  if (first.factor === 'ultradianAlignment' && first.score >= 80) {
    phrases.push("Your energy peaks at this time")
  }

  if (first.factor === 'consistency' && first.score >= 80) {
    phrases.push("This time slot worked well before")
  }

  if (first.factor === 'deepWorkProtection' && first.score >= 80 && context.goal.requiresDeepWork) {
    phrases.push("You have uninterrupted time here")
  }

  if (second.factor === 'spacedPractice' && second.score >= 70) {
    phrases.push("spacing sessions helps retention")
  }

  if (second.factor === 'stability' && second.score >= 80) {
    phrases.push("consistency builds habits faster")
  }

  if (second.factor === 'commitmentStrength' && second.score >= 70) {
    phrases.push("you're more likely to follow through")
  }

  if (second.factor === 'decisionFatigue' && second.score >= 70) {
    phrases.push("your willpower is strong early")
  }

  // Combine with proper grammar
  if (phrases.length >= 2) {
    return `${phrases[0]}, and ${phrases[1]}.`
  }

  if (phrases.length === 1) {
    return `${phrases[0]}. ${getSecondaryHint(second)}`
  }

  // Default secondary
  return getSecondaryForFactor(first, context)
}

/**
 * Get a secondary hint for a factor
 */
function getSecondaryHint(factor: ScoringFactor): string {
  const hints: Partial<Record<keyof ScoringWeights, string>> = {
    ultradianAlignment: "Matched to your energy patterns.",
    spacedPractice: "Distributed for better learning.",
    consistency: "Building a reliable routine.",
    stability: "Keeping your schedule stable.",
    commitmentStrength: "Scheduled when you're most likely to do it.",
  }

  return hints[factor.factor] || ""
}

/**
 * Get a default secondary explanation for a factor
 */
function getSecondaryForFactor(
  factor: ScoringFactor,
  context: ScoringContext
): string | undefined {
  switch (factor.factor) {
    case 'ultradianAlignment':
      return "Your energy naturally peaks during this window."

    case 'spacedPractice':
      return "Distributing sessions across the week improves retention."

    case 'consistency':
      return "Consistent timing helps form lasting habits."

    case 'deepWorkProtection':
      return "You have a solid block of uninterrupted time here."

    case 'stability':
      return "Same time as last week helps maintain momentum."

    case 'commitmentStrength':
      if (timeToMinutes(context.goal.sessionStrategy.preferredDuration.toString()) < 600) {
        return "Morning sessions have the highest follow-through."
      }
      return undefined

    default:
      return undefined
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Find the name of the anchor event for an anchored session
 */
function findAnchorName(
  event: ScheduleEvent,
  context: ScoringContext
): string {
  // If the goal has an anchor, try to find its name
  if (context.goal.anchor) {
    // In a real implementation, we'd look up the commitment title
    // For now, return a generic name
    return "fixed event"
  }
  return "scheduled block"
}

/**
 * Get a display-friendly name for a realm
 */
function getRealmDisplayName(realmId: string): string {
  // In a real implementation, we'd look up the realm name
  // For now, extract from ID or return generic
  const parts = realmId.split('-')
  if (parts.length > 1) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
  }
  return "this area"
}

// =============================================================================
// MAIN RATIONALE GENERATOR
// =============================================================================

/**
 * Generate a complete rationale for an event placement
 *
 * Design philosophy:
 * - Lead with BENEFIT, not science lecture
 * - Use "you" language - make it personal
 * - Keep primary rationale under 60 chars
 * - Save deeper explanations for optional expansion
 * - Tone: helpful assistant, not professor
 *
 * Examples of good rationales:
 * - "Scheduled when you're most focused"
 * - "Same time as last week \u2014 consistency builds habits"
 * - "Right after your morning class \u2014 habit stacking"
 *
 * Examples to avoid:
 * - "Research by Kleitman shows ultradian rhythms..."
 * - "According to BJ Fogg's habit formation research..."
 */
export function generateRationale(
  event: ScheduleEvent,
  slotScore: SlotScore,
  context: ScoringContext
): EventRationale {
  // Get top 3 contributing factors
  const topFactors = getTopScoringFactors(slotScore.breakdown, 3)

  // Generate primary rationale based on highest factor
  const primary = generatePrimaryRationale(
    topFactors[0],
    event,
    context
  )

  // Generate secondary explanation (optional deeper dive)
  const secondary = generateSecondaryRationale(topFactors, context)

  // Generate factor descriptions for detailed view
  const factors = topFactors.map(f => factorToDescription(f, context))

  return { primary, secondary, factors }
}

/**
 * Generate rationale for multiple events at once
 */
export function generateRationalesForSchedule(
  events: ScheduleEvent[],
  slotScores: SlotScore[],
  context: Omit<ScoringContext, 'goal' | 'existingEvents'>,
  goalsMap: Map<string, GoalWithMetadata>
): Map<string, EventRationale> {
  const rationales = new Map<string, EventRationale>()

  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    if (event.type !== 'goal' || !event.goalId) continue

    const goal = goalsMap.get(event.goalId)
    if (!goal) continue

    const slotScore = slotScores[i]
    if (!slotScore) continue

    const fullContext: ScoringContext = {
      ...context,
      goal,
      existingEvents: events.slice(0, i), // Events scheduled before this one
    }

    const rationale = generateRationale(event, slotScore, fullContext)
    rationales.set(event.id, rationale)
  }

  return rationales
}

/**
 * Get a simple rationale for display without full scoring context
 * Used when we don't have the full SlotScore available
 */
export function getSimpleRationale(event: ScheduleEvent): string {
  if (event.isAnchoredSession) {
    return "Linked to your fixed schedule"
  }

  if (event.isLocked) {
    return "Fixed commitment"
  }

  const startMinutes = timeToMinutes(event.slot.startTime)

  // Morning session
  if (startMinutes >= 360 && startMinutes <= 600) {
    return "Morning slot for better follow-through"
  }

  // Peak afternoon
  if (startMinutes >= 840 && startMinutes <= 1020) {
    return "Afternoon energy window"
  }

  // Weekend
  if (isWeekend(event.slot.dayOfWeek)) {
    return "Weekend flexibility"
  }

  return "Scheduled at an available time"
}
