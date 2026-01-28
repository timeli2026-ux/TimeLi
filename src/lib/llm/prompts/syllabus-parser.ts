/**
 * Syllabus Parser Prompt Template
 * Phase 12: Syllabus Import - Plan 01
 *
 * System prompts and response parsing for extracting course information
 * and assignments from syllabus text. Enables students to import entire
 * syllabi at once instead of manually entering each assignment.
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Assignment types matching the database schema
 */
export type AssignmentType =
  | 'homework'
  | 'exam'
  | 'project'
  | 'reading'
  | 'quiz'
  | 'paper'
  | 'other'

/**
 * Parsed assignment from syllabus text
 */
export interface ParsedSyllabusAssignment {
  title: string
  type: AssignmentType
  dueDate: string | null // YYYY-MM-DD format
  estimatedHours: number
  notes?: string
}

/**
 * Parsed syllabus course information and assignments
 */
export interface ParsedSyllabus {
  courseName: string
  instructor?: string
  semester?: string
  assignments: ParsedSyllabusAssignment[]
}

/**
 * Response when LLM needs more information
 */
export interface SyllabusClarificationNeeded {
  needsClarification: true
  questions: string[]
}

/**
 * Union type for parser response
 */
export type SyllabusParserResponse = ParsedSyllabus | SyllabusClarificationNeeded

// =============================================================================
// PROMPT BUILDER
// =============================================================================

/**
 * Build the system prompt for syllabus parsing
 * Instructs the LLM to extract course info and assignments from syllabus text
 */
export function buildSyllabusParserPrompt(): string {
  return `You are a syllabus extraction assistant for TimeLi, a student scheduling app.

## Your Task
Extract course information and ALL assignments from the provided syllabus text. Return a JSON code block with the extracted data.

## Output Format

If you can extract course info and assignments, return:
\`\`\`json
{
  "courseName": "string (course name/title)",
  "instructor": "string (professor/instructor name, optional)",
  "semester": "string (e.g., 'Spring 2026', optional)",
  "assignments": [
    {
      "title": "string (assignment name, max 200 chars)",
      "type": "homework" | "exam" | "project" | "reading" | "quiz" | "paper" | "other",
      "dueDate": "YYYY-MM-DD" | null,
      "estimatedHours": number (0.5-100),
      "notes": "string (optional, additional context)"
    }
  ]
}
\`\`\`

If the syllabus is too ambiguous or missing critical information, return:
\`\`\`json
{
  "needsClarification": true,
  "questions": ["Question 1?", "Question 2?"]
}
\`\`\`

## Hour Estimation Heuristics

Use these guidelines to estimate hours for each assignment type:

### Homework
- Simple problem sets: 1-3 hours
- Complex problem sets (math, physics): 3-5 hours
- Programming assignments (small): 3-5 hours
- Programming assignments (large): 5-8 hours

### Reading
- Assume ~30 pages per hour reading speed
- Chapters are typically 20-40 pages
- Light reading (fiction, general): ~40 pages/hour → 0.5-1 hours per chapter
- Dense reading (textbooks, academic): ~20 pages/hour → 1-2 hours per chapter

### Quiz
- Short quizzes: 0.5-1 hour prep
- Chapter quizzes: 1-2 hours prep

### Exam
- Quiz exam: 2-4 hours prep
- Midterm exam: 4-8 hours prep (typically ~6 hours)
- Final exam: 8-12 hours prep (typically ~10 hours)
- Comprehensive final: 10-15 hours prep

### Paper/Essay
- Writing: ~1 hour per page of final content
- Research: Add 50-100% of writing time for research
- Short paper (2-3 pages): 3-5 hours total
- Medium paper (5-8 pages): 8-12 hours total
- Long paper (10+ pages): 15-25 hours total
- Research paper with sources: Add 30% for citation work

### Project
- Small project (1-2 weeks): 10-15 hours
- Medium project (3-4 weeks): 15-25 hours
- Large project (semester-long): 25-40 hours total
- Group projects: Estimate individual contribution

## Assignment Type Classification

- **homework**: Problem sets, worksheets, exercises, assignments
- **exam**: Midterms, finals, tests, exams
- **project**: Individual or group projects, presentations, portfolios
- **reading**: Assigned readings, chapters, articles
- **quiz**: Quizzes, pop quizzes, reading checks
- **paper**: Essays, papers, reports, written assignments
- **other**: Participation, attendance, discussions, labs

## Extraction Rules

1. **Extract ALL assignments** - Don't skip any listed assignments, due dates, or deliverables

2. **Date parsing**:
   - Convert dates to YYYY-MM-DD format
   - If only weekday mentioned (e.g., "Due Friday"), set to null
   - If relative dates (e.g., "Week 5"), set to null
   - If year is missing, assume current academic year

3. **Course info**:
   - Course name: Full course title (e.g., "CS 101: Introduction to Computer Science")
   - Instructor: Professor/instructor name if listed
   - Semester: Term and year if listed (e.g., "Fall 2026")

4. **Handle incomplete syllabi**:
   - Missing dates: Set dueDate to null, include note about missing date
   - Missing course name: Ask for clarification
   - Partial schedules: Extract what's available

5. **Clarification scenarios**:
   - Syllabus doesn't mention any specific assignments
   - Course name cannot be determined
   - Text appears to be something other than a syllabus
   - Assignments are mentioned but without any identifying details

## Output Format Example (STRUCTURE ONLY - DO NOT COPY CONTENT)

\`\`\`json
{
  "courseName": "[EXTRACT FROM SYLLABUS]",
  "instructor": "[EXTRACT FROM SYLLABUS OR null]",
  "semester": "[EXTRACT FROM SYLLABUS OR null]",
  "assignments": [
    {
      "title": "[EXACT TITLE FROM SYLLABUS]",
      "type": "[homework|exam|project|reading|quiz|paper|other]",
      "dueDate": "[YYYY-MM-DD or null]",
      "estimatedHours": "[NUMBER]",
      "notes": "[OPTIONAL CONTEXT]"
    }
  ]
}
\`\`\`

If clarification needed:
\`\`\`json
{
  "needsClarification": true,
  "questions": ["[YOUR QUESTION]"]
}
\`\`\`

## MANDATORY EXTRACTION RULES

1. **READ THE ACTUAL SYLLABUS BELOW** - extract only what's written there
2. **Extract ALL graded components** from the grading breakdown (e.g., "20% Prelim" = extract the prelim)
3. **Extract ALL weekly/recurring work** as ONE entry with frequency noted
4. **Extract ALL required films/viewings** as reading assignments
5. **Use EXACT dates** from the syllabus (e.g., "February 26" → "2026-02-26")
6. **Use titles FROM THE SYLLABUS** - don't paraphrase or invent titles

## WHAT TO EXTRACT

From a typical syllabus, look for:
- Grading breakdown items (prelims, papers, projects, participation)
- Items in the class schedule with due dates
- Required films or viewings
- Recurring assignments (reflections, journals, problem sets)

## DATE HANDLING

- "February 26" or "Feb 26" → "2026-02-26"
- "Monday 4/13" → "2026-04-13"
- "Week 8" or "TBA" → null (add note about timing)
- Assume year 2026 for Spring semester, 2025 for Fall`
}

// =============================================================================
// RESPONSE PARSER
// =============================================================================

/**
 * Valid assignment types for validation
 */
const VALID_ASSIGNMENT_TYPES: AssignmentType[] = [
  'homework',
  'exam',
  'project',
  'reading',
  'quiz',
  'paper',
  'other',
]

/**
 * Parse LLM response to extract syllabus data or clarification request
 *
 * @param response - Raw LLM response text
 * @returns Parsed syllabus, clarification request, or null if parsing fails
 */
export function parseSyllabusResponse(response: string): SyllabusParserResponse | null {
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
    console.warn('[SyllabusParser] No JSON block found in response')
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
      console.warn('[SyllabusParser] Failed to parse JSON block:', error)
      continue
    }
  }

  return null
}

/**
 * Validate and parse JSON string into SyllabusParserResponse
 */
function validateAndParseJson(jsonString: string): SyllabusParserResponse | null {
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

  // Validate as ParsedSyllabus
  return validateParsedSyllabus(parsed)
}

/**
 * Validate parsed object as a ParsedSyllabus
 */
function validateParsedSyllabus(parsed: unknown): ParsedSyllabus | null {
  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  const obj = parsed as Record<string, unknown>

  // Validate required fields
  const courseName = obj.courseName
  if (typeof courseName !== 'string' || courseName.length === 0) {
    console.warn('[SyllabusParser] Invalid or missing courseName')
    return null
  }

  // Validate assignments array
  const assignments = obj.assignments
  if (!Array.isArray(assignments)) {
    console.warn('[SyllabusParser] Invalid or missing assignments array')
    return null
  }

  // Validate each assignment
  const validatedAssignments: ParsedSyllabusAssignment[] = []
  for (const assignment of assignments) {
    const validated = validateAssignment(assignment)
    if (validated) {
      validatedAssignments.push(validated)
    }
  }

  // Optional fields
  const instructor = typeof obj.instructor === 'string' ? obj.instructor : undefined
  const semester = typeof obj.semester === 'string' ? obj.semester : undefined

  return {
    courseName: courseName.slice(0, 200),
    instructor,
    semester,
    assignments: validatedAssignments,
  }
}

/**
 * Validate a single assignment object
 */
function validateAssignment(assignment: unknown): ParsedSyllabusAssignment | null {
  if (!assignment || typeof assignment !== 'object') {
    return null
  }

  const obj = assignment as Record<string, unknown>

  // Validate title (required)
  const title = obj.title
  if (typeof title !== 'string' || title.length === 0) {
    console.warn('[SyllabusParser] Invalid or missing assignment title')
    return null
  }

  // Validate type (required)
  const type = obj.type
  if (typeof type !== 'string' || !VALID_ASSIGNMENT_TYPES.includes(type as AssignmentType)) {
    console.warn('[SyllabusParser] Invalid or missing assignment type:', type)
    return null
  }

  // Validate dueDate (can be null or YYYY-MM-DD)
  const dueDate = obj.dueDate
  let validDueDate: string | null = null
  if (dueDate === null) {
    validDueDate = null
  } else if (typeof dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    validDueDate = dueDate
  }

  // Validate estimatedHours (required)
  const estimatedHours = obj.estimatedHours
  if (typeof estimatedHours !== 'number' || estimatedHours < 0.5 || estimatedHours > 100) {
    console.warn('[SyllabusParser] Invalid estimatedHours:', estimatedHours)
    return null
  }

  // Optional notes
  const notes = typeof obj.notes === 'string' && obj.notes.length > 0 ? obj.notes : undefined

  return {
    title: title.slice(0, 200),
    type: type as AssignmentType,
    dueDate: validDueDate,
    estimatedHours,
    notes,
  }
}

/**
 * Check if response is a clarification request
 */
export function isSyllabusClarificationNeeded(
  response: SyllabusParserResponse
): response is SyllabusClarificationNeeded {
  return 'needsClarification' in response && response.needsClarification === true
}
