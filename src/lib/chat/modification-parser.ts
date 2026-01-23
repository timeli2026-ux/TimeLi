/**
 * Modification Parser
 * Phase 6.5: Schedule Chat - Plan 03
 *
 * Parses Claude's chat responses to extract schedule modification actions.
 * Looks for JSON code blocks with structured modification data.
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Parsed schedule modification from Claude's response
 */
export interface ScheduleModification {
  action: 'move' | 'delete' | 'feedback' | 'none'
  eventId?: string
  newSlot?: {
    dayOfWeek: number
    startTime: string
  }
  feedback?: string
}

// =============================================================================
// PARSER
// =============================================================================

/**
 * Parse Claude's response to extract modification actions
 *
 * Looks for JSON code blocks in the format:
 * ```json
 * { "action": "move", "eventId": "evt_xxx", ... }
 * ```
 *
 * @param response - Claude's full text response
 * @returns Parsed modification or null if no modification found
 */
export function parseModificationFromResponse(response: string): ScheduleModification | null {
  // Look for JSON code blocks
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/g
  const matches = [...response.matchAll(jsonBlockRegex)]

  if (matches.length === 0) {
    // No JSON blocks found - this is a conversational response
    return null
  }

  // Try to parse each JSON block (take the first valid one)
  for (const match of matches) {
    const jsonContent = match[1].trim()

    try {
      const parsed = JSON.parse(jsonContent)

      // Validate the parsed structure
      const modification = validateModification(parsed)
      if (modification) {
        return modification
      }
    } catch (error) {
      // Log warning but continue to next block
      console.warn('[ModificationParser] Failed to parse JSON block:', error)
      continue
    }
  }

  // No valid modifications found in any JSON blocks
  return null
}

/**
 * Validate and normalize a parsed modification object
 *
 * @param parsed - Raw parsed JSON object
 * @returns Validated ScheduleModification or null if invalid
 */
function validateModification(parsed: unknown): ScheduleModification | null {
  // Type guard
  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  const obj = parsed as Record<string, unknown>

  // Check action field
  const action = obj.action
  if (!action || typeof action !== 'string') {
    return null
  }

  // Validate based on action type
  switch (action) {
    case 'move': {
      // Must have eventId and newSlot
      const eventId = obj.eventId
      const newSlot = obj.newSlot as Record<string, unknown> | undefined

      if (typeof eventId !== 'string' || !eventId) {
        console.warn('[ModificationParser] Move action missing eventId')
        return null
      }

      if (!newSlot || typeof newSlot !== 'object') {
        console.warn('[ModificationParser] Move action missing newSlot')
        return null
      }

      const dayOfWeek = newSlot.dayOfWeek
      const startTime = newSlot.startTime

      if (typeof dayOfWeek !== 'number' || dayOfWeek < 0 || dayOfWeek > 6) {
        console.warn('[ModificationParser] Move action has invalid dayOfWeek')
        return null
      }

      if (typeof startTime !== 'string' || !isValidTimeFormat(startTime)) {
        console.warn('[ModificationParser] Move action has invalid startTime')
        return null
      }

      return {
        action: 'move',
        eventId,
        newSlot: {
          dayOfWeek,
          startTime,
        },
      }
    }

    case 'delete': {
      // Must have eventId
      const eventId = obj.eventId

      if (typeof eventId !== 'string' || !eventId) {
        console.warn('[ModificationParser] Delete action missing eventId')
        return null
      }

      return {
        action: 'delete',
        eventId,
      }
    }

    case 'feedback': {
      // Must have feedback string
      const feedback = obj.feedback

      if (typeof feedback !== 'string' || !feedback) {
        console.warn('[ModificationParser] Feedback action missing feedback')
        return null
      }

      return {
        action: 'feedback',
        feedback,
      }
    }

    default:
      // Unknown action
      console.warn('[ModificationParser] Unknown action type:', action)
      return null
  }
}

/**
 * Validate time format (HH:mm)
 */
function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
  return timeRegex.test(time)
}

/**
 * Extract the text response without JSON blocks
 * Useful for displaying only the conversational part
 */
export function extractTextWithoutJson(response: string): string {
  return response
    .replace(/```json\s*[\s\S]*?\s*```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
