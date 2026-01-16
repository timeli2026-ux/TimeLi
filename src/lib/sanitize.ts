/**
 * Input Sanitization Utilities
 *
 * SQL INJECTION PREVENTION:
 * Supabase JS client uses parameterized queries by default.
 * NEVER use string concatenation for SQL queries.
 * Always use .eq(), .match(), .filter() methods.
 *
 * RICH TEXT WARNING:
 * For rich text that preserves some HTML, use DOMPurify instead:
 * npm install dompurify @types/dompurify
 * import DOMPurify from 'dompurify'
 * const clean = DOMPurify.sanitize(dirty, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong'] })
 *
 * INTEGRATION POINTS:
 * - All user-facing form inputs: goal titles, names, descriptions
 * - API route request bodies: validate and sanitize before database operations
 * - Display outputs: use escapeHtml for any dangerouslySetInnerHTML usage
 */

/**
 * Escape HTML entities to prevent XSS attacks.
 * Use for any user content that might be rendered in contexts where
 * React's auto-escaping doesn't apply.
 *
 * @param input - The string to escape
 * @returns The escaped string with HTML entities encoded
 */
export function escapeHtml(input: string): string {
  if (input == null) {
    return ''
  }

  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Sanitize a string for safe use in HTML attributes.
 * Escapes quotes and backslashes, removes null bytes and control characters.
 *
 * @param input - The string to sanitize
 * @returns The sanitized string safe for HTML attributes
 */
export function sanitizeForAttribute(input: string): string {
  if (input == null) {
    return ''
  }

  return String(input)
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters (0x00-0x1F except tab \x09, newline \x0A, carriage return \x0D)
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    // Escape quotes and backslashes
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Remove all HTML tags from a string.
 * Use for user input that should be plain text only.
 *
 * @param input - The string to strip HTML from
 * @returns The string with all HTML tags removed
 */
export function stripHtml(input: string): string {
  if (input == null) {
    return ''
  }

  // Remove all HTML tags including self-closing and tags with attributes
  return String(input).replace(/<[^>]*>/g, '')
}

/**
 * Normalize whitespace by collapsing multiple spaces/tabs to single space
 * and trimming leading/trailing whitespace.
 *
 * @param input - The string to normalize
 * @returns The string with normalized whitespace
 */
export function normalizeWhitespace(input: string): string {
  if (input == null) {
    return ''
  }

  return String(input)
    // Replace tabs and multiple spaces with single space
    .replace(/[\t ]+/g, ' ')
    // Normalize newlines
    .replace(/\r\n/g, '\n')
    // Collapse multiple newlines to single newline
    .replace(/\n+/g, '\n')
    // Trim leading/trailing whitespace
    .trim()
}

/**
 * Normalize Unicode text to NFC (Canonical Decomposition, followed by Canonical Composition).
 * Important for internationalization to ensure consistent text representation.
 *
 * @param input - The string to normalize
 * @returns The Unicode-normalized string
 */
export function normalizeUnicode(input: string): string {
  if (input == null) {
    return ''
  }

  return String(input).normalize('NFC')
}

/**
 * Combined sanitization for user input.
 * Strips HTML tags, normalizes whitespace and unicode, removes null bytes,
 * and optionally limits length.
 *
 * @param input - The string to sanitize
 * @param options - Optional settings
 * @param options.maxLength - Maximum length of the output string
 * @returns The fully sanitized string
 */
export function sanitizeUserInput(
  input: string,
  options?: { maxLength?: number }
): string {
  if (input == null) {
    return ''
  }

  let result = String(input)

  // Remove null bytes
  result = result.replace(/\0/g, '')

  // Strip HTML tags
  result = stripHtml(result)

  // Normalize whitespace
  result = normalizeWhitespace(result)

  // Normalize unicode
  result = normalizeUnicode(result)

  // Limit length if maxLength provided
  if (options?.maxLength && result.length > options.maxLength) {
    result = result.slice(0, options.maxLength)
  }

  return result
}
