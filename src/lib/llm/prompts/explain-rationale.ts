/**
 * Explain Rationale Prompt Template
 * Phase 8: LLM Gateway - Plan 03
 *
 * Generates human-readable explanations for why events were scheduled
 * at specific times. Output is constrained to <=240 characters.
 */

import type { ScheduleEventWithFlexibility } from '@/lib/scheduling/types'
import type { ScoringWeights } from '@/lib/scheduling/scoring'

/**
 * Scoring factor affecting slot selection
 */
export interface ScoringFactor {
  type: keyof ScoringWeights
  scoreContribution: number // positive = helped, negative = hurt
  description: string // e.g., "Morning slot matches high energy period"
}

/**
 * Human-readable names for scoring factors
 */
const FACTOR_NAMES: Record<keyof ScoringWeights, string> = {
  ultradianAlignment: 'energy alignment',
  spacedPractice: 'spacing for learning',
  consistency: 'habit consistency',
  deepWorkProtection: 'focus time protection',
  decisionFatigue: 'willpower availability',
  commitmentStrength: 'follow-through likelihood',
  stability: 'schedule stability',
  realmBalance: 'life balance',
  deadlineProximity: 'deadline urgency',
}

/**
 * Build prompt for generating schedule explanation
 *
 * @param event - The scheduled event with flexibility info
 * @param scoringFactors - Top 3 factors affecting slot selection
 * @returns System prompt for the LLM
 */
export function buildExplainPrompt(
  event: ScheduleEventWithFlexibility,
  scoringFactors: ScoringFactor[]
): string {
  const factorDescriptions = scoringFactors
    .slice(0, 3)
    .map((f, i) => `${i + 1}. ${f.description} (${FACTOR_NAMES[f.type]}: ${f.scoreContribution > 0 ? '+' : ''}${f.scoreContribution.toFixed(0)})`)
    .join('\n')

  return `You are a scheduling assistant that explains why events were scheduled at specific times.

Generate a SINGLE explanation sentence for why "${event.title}" was scheduled at ${event.slot.startTime} on ${getDayName(event.slot.dayOfWeek)}.

Top scoring factors:
${factorDescriptions}

Requirements:
- Write ONE conversational sentence
- Maximum 240 characters total
- Focus on user benefit, not technical details
- Use natural language (no bullet points)
- Start with "Scheduled at [time] because..."

Example output:
"Scheduled at 9am because it matches your peak energy hours, leaves afternoon free for creative work, and fits your Monday routine."

Respond with ONLY the explanation sentence, nothing else.`
}

/**
 * Parse LLM response and enforce character limit
 *
 * @param response - Raw LLM response
 * @returns Explanation string truncated to <=240 chars
 */
export function parseExplainResponse(response: string): string {
  // Clean up the response
  let explanation = response.trim()

  // Remove any quotes if wrapped
  if ((explanation.startsWith('"') && explanation.endsWith('"')) ||
      (explanation.startsWith("'") && explanation.endsWith("'"))) {
    explanation = explanation.slice(1, -1)
  }

  // Ensure it starts appropriately
  if (!explanation.toLowerCase().startsWith('scheduled')) {
    explanation = `Scheduled at this time because ${explanation.charAt(0).toLowerCase()}${explanation.slice(1)}`
  }

  // Enforce character limit
  if (explanation.length > 240) {
    // Try to truncate at a sentence or clause boundary
    const truncateAt = Math.min(
      explanation.lastIndexOf('.', 237) + 1,
      explanation.lastIndexOf(',', 237) + 1,
      237
    )

    if (truncateAt > 150) {
      explanation = explanation.slice(0, truncateAt).trim()
    } else {
      // Hard truncate with ellipsis
      explanation = explanation.slice(0, 237).trim() + '...'
    }
  }

  return explanation
}

/**
 * Get day name from day of week number
 */
function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayOfWeek] || 'Unknown'
}

/**
 * Build scoring factors from a score breakdown
 * Helper to convert raw scores to ScoringFactor objects
 */
export function buildScoringFactors(
  breakdown: Record<keyof ScoringWeights, number>,
  baselineScore: number = 50
): ScoringFactor[] {
  const factors: ScoringFactor[] = []

  for (const [type, score] of Object.entries(breakdown)) {
    const contribution = score - baselineScore
    factors.push({
      type: type as keyof ScoringWeights,
      scoreContribution: contribution,
      description: getFactorDescription(type as keyof ScoringWeights, score),
    })
  }

  // Sort by absolute contribution (most impactful first)
  return factors.sort((a, b) => Math.abs(b.scoreContribution) - Math.abs(a.scoreContribution))
}

/**
 * Generate human-readable description for a scoring factor
 */
function getFactorDescription(type: keyof ScoringWeights, score: number): string {
  const isPositive = score >= 70
  const isNegative = score < 40

  const descriptions: Record<keyof ScoringWeights, { positive: string; negative: string; neutral: string }> = {
    ultradianAlignment: {
      positive: 'Matches your peak energy period',
      negative: 'During lower energy time',
      neutral: 'Moderate energy alignment',
    },
    spacedPractice: {
      positive: 'Well-spaced from similar sessions',
      negative: 'Close to other sessions of same type',
      neutral: 'Reasonable session spacing',
    },
    consistency: {
      positive: 'Aligns with your established routine',
      negative: 'Differs from your usual pattern',
      neutral: 'Building new habit pattern',
    },
    deepWorkProtection: {
      positive: 'Protected focus time available',
      negative: 'Limited uninterrupted time',
      neutral: 'Adequate focus window',
    },
    decisionFatigue: {
      positive: 'Fresh willpower early in day',
      negative: 'Later when willpower may be depleted',
      neutral: 'Moderate mental energy time',
    },
    commitmentStrength: {
      positive: 'High follow-through likelihood',
      negative: 'Lower commitment window',
      neutral: 'Standard commitment time',
    },
    stability: {
      positive: 'Same as last week for consistency',
      negative: 'Different from previous schedule',
      neutral: 'Building schedule stability',
    },
    realmBalance: {
      positive: 'Maintains balance across life areas',
      negative: 'May over-represent this life area',
      neutral: 'Reasonable life balance',
    },
    deadlineProximity: {
      positive: 'Prioritizes urgent deadline',
      negative: 'May need earlier attention',
      neutral: 'Appropriate deadline timing',
    },
  }

  const factorDescs = descriptions[type]
  if (isPositive) return factorDescs.positive
  if (isNegative) return factorDescs.negative
  return factorDescs.neutral
}
