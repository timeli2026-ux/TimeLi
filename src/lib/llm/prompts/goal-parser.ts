/**
 * Goal Parser Prompt Template
 * Phase 8: LLM Gateway - Plan 02
 *
 * System prompts and response parsing for natural language goal extraction.
 * Enables users to describe goals in plain language and receive structured data.
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Realm types that map to life_realms table
 */
export type RealmName =
  | 'health'
  | 'career'
  | 'learning'
  | 'relationships'
  | 'creativity'
  | 'finance'
  | 'personal'
  | 'spiritual'

/**
 * Frequency options for goal scheduling
 */
export type GoalFrequency = 'daily' | 'weekly' | 'custom'

/**
 * Priority levels for goals
 */
export type GoalPriority = 'low' | 'medium' | 'high'

/**
 * Parsed goal structure extracted from natural language
 */
export interface ParsedGoal {
  title: string
  description?: string
  hours_per_week: number
  frequency: GoalFrequency
  sessions_per_week: number
  preferred_duration_minutes: number
  realm_name: RealmName
  deadline: string | null // YYYY-MM-DD format
  priority: GoalPriority
}

/**
 * Response when LLM needs more information
 */
export interface ClarificationNeeded {
  needsClarification: true
  questions: string[]
}

/**
 * Union type for parser response
 */
export type GoalParserResponse = ParsedGoal | ClarificationNeeded

// =============================================================================
// PROMPT BUILDER
// =============================================================================

/**
 * Build the system prompt for goal parsing
 * Instructs the LLM to extract structured goal data from natural language
 */
export function buildGoalParserPrompt(): string {
  return `You are a goal extraction assistant for TimeLi, a cognitive science-backed scheduling app.

## Your Task
Extract structured goal information from the user's natural language description. Return a JSON code block with the extracted data.

## Output Format

If you can extract all required fields, return:
\`\`\`json
{
  "title": "string (concise goal name, max 100 chars)",
  "description": "string (optional details, can be empty)",
  "hours_per_week": number (1-40),
  "frequency": "daily" | "weekly" | "custom",
  "sessions_per_week": number (1-14),
  "preferred_duration_minutes": number (15-480),
  "realm_name": "health" | "career" | "learning" | "relationships" | "creativity" | "finance" | "personal" | "spiritual",
  "deadline": "YYYY-MM-DD" | null,
  "priority": "low" | "medium" | "high"
}
\`\`\`

If you cannot determine required fields (hours_per_week, realm_name, sessions_per_week), return:
\`\`\`json
{
  "needsClarification": true,
  "questions": ["Question 1?", "Question 2?"]
}
\`\`\`

## Extraction Rules

1. **Required fields** (must ask for clarification if unclear):
   - hours_per_week: How much time per week
   - realm_name: Which life area (health, career, learning, etc.)
   - sessions_per_week: How often per week

2. **Inferable fields** (use reasonable defaults if not specified):
   - title: Extract from description (keep concise)
   - description: Additional context (empty if none)
   - frequency: Infer from sessions_per_week (daily if 5+, weekly if 1-2, custom otherwise)
   - preferred_duration_minutes: Calculate from hours_per_week / sessions_per_week, or default to 60
   - deadline: Extract if mentioned, null otherwise
   - priority: Default to "medium" unless urgency is indicated

3. **Realm mapping** (use context clues):
   - health: exercise, fitness, diet, sleep, mental health, meditation
   - career: work, job, professional development, side projects for income
   - learning: study, courses, reading, skills, languages
   - relationships: family, friends, dating, social activities
   - creativity: art, music, writing, hobbies, crafts
   - finance: budgeting, investing, savings
   - personal: organization, home improvement, errands
   - spiritual: religion, mindfulness, self-reflection

4. **Time parsing examples**:
   - "30 minutes daily" = hours_per_week: 3.5, sessions_per_week: 7, preferred_duration_minutes: 30
   - "2 hours twice a week" = hours_per_week: 4, sessions_per_week: 2, preferred_duration_minutes: 120
   - "10 hours a week" = hours_per_week: 10 (ask for session frequency)

5. **Keep clarifying questions focused**:
   - Ask only for missing required information
   - Maximum 2-3 questions per response
   - Be specific and provide options when helpful

## Examples

User: "I want to learn Spanish for an hour every day"
Response:
\`\`\`json
{
  "title": "Learn Spanish",
  "description": "",
  "hours_per_week": 7,
  "frequency": "daily",
  "sessions_per_week": 7,
  "preferred_duration_minutes": 60,
  "realm_name": "learning",
  "deadline": null,
  "priority": "medium"
}
\`\`\`

User: "Start going to the gym"
Response:
\`\`\`json
{
  "needsClarification": true,
  "questions": [
    "How many hours per week would you like to dedicate to the gym?",
    "How many times per week do you want to go?"
  ]
}
\`\`\`

User: "Need to finish my thesis by March, probably need 15 hours a week"
Response:
\`\`\`json
{
  "title": "Finish thesis",
  "description": "",
  "hours_per_week": 15,
  "frequency": "custom",
  "sessions_per_week": 5,
  "preferred_duration_minutes": 180,
  "realm_name": "learning",
  "deadline": "2026-03-31",
  "priority": "high"
}
\`\`\`

## Important
- Extract ONLY what is explicitly stated or clearly implied
- For ambiguous cases, ask for clarification
- Return ONLY the JSON code block, no additional text`
}

// =============================================================================
// RESPONSE PARSER
// =============================================================================

/**
 * Valid realm names for validation
 */
const VALID_REALMS: RealmName[] = [
  'health',
  'career',
  'learning',
  'relationships',
  'creativity',
  'finance',
  'personal',
  'spiritual',
]

/**
 * Valid frequencies for validation
 */
const VALID_FREQUENCIES: GoalFrequency[] = ['daily', 'weekly', 'custom']

/**
 * Valid priorities for validation
 */
const VALID_PRIORITIES: GoalPriority[] = ['low', 'medium', 'high']

/**
 * Parse LLM response to extract goal data or clarification request
 *
 * @param response - Raw LLM response text
 * @returns Parsed goal, clarification request, or null if parsing fails
 */
export function parseGoalResponse(response: string): GoalParserResponse | null {
  // Extract JSON from code block
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/g
  const matches = [...response.matchAll(jsonBlockRegex)]

  if (matches.length === 0) {
    // Try parsing as raw JSON (some models skip the code block)
    try {
      const trimmed = response.trim()
      if (trimmed.startsWith('{')) {
        return validateAndParseJson(trimmed)
      }
    } catch {
      // Not valid JSON
    }
    console.warn('[GoalParser] No JSON block found in response')
    return null
  }

  // Try each JSON block
  for (const match of matches) {
    const jsonContent = match[1].trim()
    try {
      const result = validateAndParseJson(jsonContent)
      if (result) {
        return result
      }
    } catch (error) {
      console.warn('[GoalParser] Failed to parse JSON block:', error)
      continue
    }
  }

  return null
}

/**
 * Validate and parse JSON string into GoalParserResponse
 */
function validateAndParseJson(jsonString: string): GoalParserResponse | null {
  const parsed = JSON.parse(jsonString)

  // Check if it's a clarification response
  if (parsed.needsClarification === true && Array.isArray(parsed.questions)) {
    return {
      needsClarification: true,
      questions: parsed.questions.filter(
        (q: unknown) => typeof q === 'string' && q.length > 0
      ),
    }
  }

  // Validate as ParsedGoal
  return validateParsedGoal(parsed)
}

/**
 * Validate parsed object as a ParsedGoal
 */
function validateParsedGoal(parsed: unknown): ParsedGoal | null {
  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  const obj = parsed as Record<string, unknown>

  // Validate required fields
  const title = obj.title
  if (typeof title !== 'string' || title.length === 0 || title.length > 100) {
    console.warn('[GoalParser] Invalid or missing title')
    return null
  }

  const hoursPerWeek = obj.hours_per_week
  if (typeof hoursPerWeek !== 'number' || hoursPerWeek < 0.5 || hoursPerWeek > 40) {
    console.warn('[GoalParser] Invalid or missing hours_per_week')
    return null
  }

  const realmName = obj.realm_name
  if (typeof realmName !== 'string' || !VALID_REALMS.includes(realmName as RealmName)) {
    console.warn('[GoalParser] Invalid or missing realm_name')
    return null
  }

  const sessionsPerWeek = obj.sessions_per_week
  if (typeof sessionsPerWeek !== 'number' || sessionsPerWeek < 1 || sessionsPerWeek > 14) {
    console.warn('[GoalParser] Invalid or missing sessions_per_week')
    return null
  }

  // Validate optional fields with defaults
  const description =
    typeof obj.description === 'string' ? obj.description : ''

  const frequency = obj.frequency
  const validFrequency: GoalFrequency =
    typeof frequency === 'string' && VALID_FREQUENCIES.includes(frequency as GoalFrequency)
      ? (frequency as GoalFrequency)
      : 'weekly'

  const preferredDuration = obj.preferred_duration_minutes
  const validDuration: number =
    typeof preferredDuration === 'number' && preferredDuration >= 15 && preferredDuration <= 480
      ? preferredDuration
      : 60

  const deadline = obj.deadline
  const validDeadline: string | null =
    deadline === null
      ? null
      : typeof deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(deadline)
        ? deadline
        : null

  const priority = obj.priority
  const validPriority: GoalPriority =
    typeof priority === 'string' && VALID_PRIORITIES.includes(priority as GoalPriority)
      ? (priority as GoalPriority)
      : 'medium'

  return {
    title: title.slice(0, 100), // Enforce max length
    description,
    hours_per_week: hoursPerWeek,
    frequency: validFrequency,
    sessions_per_week: sessionsPerWeek,
    preferred_duration_minutes: validDuration,
    realm_name: realmName as RealmName,
    deadline: validDeadline,
    priority: validPriority,
  }
}

/**
 * Check if response is a clarification request
 */
export function isClarificationNeeded(
  response: GoalParserResponse
): response is ClarificationNeeded {
  return 'needsClarification' in response && response.needsClarification === true
}
