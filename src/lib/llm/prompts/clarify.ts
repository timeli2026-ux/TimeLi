/**
 * Clarify Prompt Template
 * Phase 8: LLM Gateway - Plan 02
 *
 * System prompts and response parsing for generating clarifying questions.
 * Used when goal parsing needs more information from the user.
 */

import type { ParsedGoal } from './goal-parser'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Clarifying question with optional suggested options
 */
export interface ClarifyResponse {
  question: string
  options?: string[]
}

// =============================================================================
// PROMPT BUILDER
// =============================================================================

/**
 * Build the system prompt for generating a clarifying question
 *
 * @param partialGoal - Partially extracted goal data
 * @param context - Optional additional context about the conversation
 * @returns System prompt for the LLM
 */
export function buildClarifyPrompt(
  partialGoal: Partial<ParsedGoal>,
  context?: string
): string {
  // Build context about what we already know
  const knownFields: string[] = []
  const missingFields: string[] = []

  if (partialGoal.title) {
    knownFields.push(`- Title: "${partialGoal.title}"`)
  } else {
    missingFields.push('title (what the goal is)')
  }

  if (partialGoal.hours_per_week) {
    knownFields.push(`- Hours per week: ${partialGoal.hours_per_week}`)
  } else {
    missingFields.push('hours_per_week (time commitment)')
  }

  if (partialGoal.sessions_per_week) {
    knownFields.push(`- Sessions per week: ${partialGoal.sessions_per_week}`)
  } else {
    missingFields.push('sessions_per_week (frequency)')
  }

  if (partialGoal.realm_name) {
    knownFields.push(`- Life area: ${partialGoal.realm_name}`)
  } else {
    missingFields.push('realm_name (life area category)')
  }

  if (partialGoal.frequency) {
    knownFields.push(`- Frequency: ${partialGoal.frequency}`)
  }

  if (partialGoal.preferred_duration_minutes) {
    knownFields.push(`- Session duration: ${partialGoal.preferred_duration_minutes} minutes`)
  }

  if (partialGoal.deadline) {
    knownFields.push(`- Deadline: ${partialGoal.deadline}`)
  }

  if (partialGoal.priority) {
    knownFields.push(`- Priority: ${partialGoal.priority}`)
  }

  const knownSection = knownFields.length > 0
    ? `## What We Know\n${knownFields.join('\n')}`
    : '## What We Know\nNothing yet - this is the user\'s first message.'

  const missingSection = missingFields.length > 0
    ? `## Missing Information\n${missingFields.map(f => `- ${f}`).join('\n')}`
    : '## Missing Information\nNone - all required fields are present.'

  const contextSection = context
    ? `\n## Additional Context\n${context}\n`
    : ''

  return `You are a friendly goal-setting assistant for TimeLi, a cognitive science-backed scheduling app.

## Your Task
Generate a SINGLE, focused clarifying question to help the user define their goal. The question should:
1. Be conversational and friendly
2. Focus on the MOST important missing piece of information
3. Provide helpful options when applicable
4. NOT repeat information already provided

${knownSection}

${missingSection}
${contextSection}
## Output Format

Return a JSON code block with:
\`\`\`json
{
  "question": "Your friendly question here?",
  "options": ["Option 1", "Option 2", "Option 3"]
}
\`\`\`

The "options" array is OPTIONAL - include it only when:
- The question has a finite set of good answers (like choosing a life area)
- Options would help the user understand what you're asking
- Options shouldn't exceed 5-6 items

## Question Priority

Ask about missing fields in this order of importance:
1. What the goal actually is (if title is unclear)
2. How much time per week (hours_per_week) - REQUIRED
3. How often per week (sessions_per_week) - REQUIRED
4. Which life area it belongs to (realm_name) - REQUIRED

## Examples

If we don't know time commitment:
\`\`\`json
{
  "question": "How much time would you like to dedicate to this each week?",
  "options": ["About 1-2 hours", "3-5 hours", "5-10 hours", "More than 10 hours"]
}
\`\`\`

If we don't know frequency:
\`\`\`json
{
  "question": "How often would you like to work on this?",
  "options": ["Every day", "A few times a week", "Once or twice a week"]
}
\`\`\`

If we don't know the life area:
\`\`\`json
{
  "question": "Which area of your life does this goal fit into?",
  "options": ["Health & Fitness", "Career & Work", "Learning & Skills", "Relationships", "Creative Projects", "Personal Growth"]
}
\`\`\`

If we need more details about an ambiguous goal:
\`\`\`json
{
  "question": "Could you tell me more about what you'd like to accomplish? For example, is this about learning something new, building a habit, or completing a project?"
}
\`\`\`

## Important Rules
- Generate ONLY ONE question per response
- Be concise - this is chat, not a form
- Don't ask about optional fields (deadline, priority) unless all required fields are known
- If all required fields are present, don't generate a question (return empty question)
- Return ONLY the JSON code block, no additional text`
}

// =============================================================================
// RESPONSE PARSER
// =============================================================================

/**
 * Parse LLM response to extract clarifying question and options
 *
 * @param response - Raw LLM response text
 * @returns Parsed clarify response or null if parsing fails
 */
export function parseClarifyResponse(response: string): ClarifyResponse | null {
  // Extract JSON from code block
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/g
  const matches = [...response.matchAll(jsonBlockRegex)]

  if (matches.length === 0) {
    // Try parsing as raw JSON
    try {
      const trimmed = response.trim()
      if (trimmed.startsWith('{')) {
        return validateClarifyResponse(JSON.parse(trimmed))
      }
    } catch {
      // Not valid JSON
    }
    console.warn('[ClarifyParser] No JSON block found in response')
    return null
  }

  // Try each JSON block
  for (const match of matches) {
    const jsonContent = match[1].trim()
    try {
      const result = validateClarifyResponse(JSON.parse(jsonContent))
      if (result) {
        return result
      }
    } catch (error) {
      console.warn('[ClarifyParser] Failed to parse JSON block:', error)
      continue
    }
  }

  return null
}

/**
 * Validate parsed JSON as ClarifyResponse
 */
function validateClarifyResponse(parsed: unknown): ClarifyResponse | null {
  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  const obj = parsed as Record<string, unknown>

  // Question is required
  const question = obj.question
  if (typeof question !== 'string' || question.length === 0) {
    console.warn('[ClarifyParser] Missing or invalid question')
    return null
  }

  // Options are optional but must be valid array of strings if present
  const options = obj.options
  let validOptions: string[] | undefined

  if (options !== undefined) {
    if (!Array.isArray(options)) {
      console.warn('[ClarifyParser] Options is not an array')
      // Don't fail - just ignore invalid options
    } else {
      validOptions = options
        .filter((opt): opt is string => typeof opt === 'string' && opt.length > 0)
        .slice(0, 6) // Max 6 options

      // Only include if we have at least 2 valid options
      if (validOptions.length < 2) {
        validOptions = undefined
      }
    }
  }

  return {
    question: question.slice(0, 500), // Enforce reasonable length
    ...(validOptions && { options: validOptions }),
  }
}

/**
 * Determine if clarification is needed based on partial goal
 * Returns true if any required fields are missing
 */
export function needsClarification(partialGoal: Partial<ParsedGoal>): boolean {
  return (
    !partialGoal.hours_per_week ||
    !partialGoal.sessions_per_week ||
    !partialGoal.realm_name
  )
}

/**
 * Get the most important missing field for prioritized questioning
 */
export function getMissingPriority(partialGoal: Partial<ParsedGoal>): string | null {
  if (!partialGoal.title) return 'title'
  if (!partialGoal.hours_per_week) return 'hours_per_week'
  if (!partialGoal.sessions_per_week) return 'sessions_per_week'
  if (!partialGoal.realm_name) return 'realm_name'
  return null
}
