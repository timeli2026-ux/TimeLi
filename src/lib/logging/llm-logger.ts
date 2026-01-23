/**
 * Secure LLM Logging Service
 * Phase 8: LLM Gateway - Plan 03
 *
 * SEC-16 Compliance: Secure logging for LLM requests without exposing
 * sensitive information (API keys, secrets, PII).
 */

import { createHash } from 'crypto'

/**
 * Parameters for logging an LLM request
 */
export interface LLMLogParams {
  userId: string
  endpoint: string
  provider: string
  inputTokens: number
  outputTokens: number
  cached: boolean
  latencyMs: number
  error?: string
}

/**
 * Log levels for structured logging
 */
type LogLevel = 'info' | 'warn' | 'error'

/**
 * Structured log entry
 */
interface LLMLogEntry {
  timestamp: string
  level: LogLevel
  event: 'llm_request'
  userId: string // hashed
  endpoint: string
  provider: string
  inputTokens: number
  outputTokens: number
  cached: boolean
  latencyMs: number
  error?: string
}

/**
 * Hash userId for logs (SHA-256, first 8 chars)
 * This provides privacy while still allowing request correlation
 */
function hashUserId(userId: string): string {
  const hash = createHash('sha256').update(userId).digest('hex')
  return hash.slice(0, 8)
}

/**
 * Determine log level based on request characteristics
 */
function determineLogLevel(params: LLMLogParams): LogLevel {
  if (params.error) return 'error'
  if (params.latencyMs > 2000) return 'warn' // Slow request warning
  return 'info'
}

/**
 * Format log entry for output
 */
function formatLogEntry(entry: LLMLogEntry): string {
  return JSON.stringify(entry)
}

/**
 * Log an LLM request with SEC-16 compliant security measures
 *
 * Security requirements:
 * - NEVER logs API keys (sanitized headers)
 * - NEVER logs full prompts (only endpoint + token counts)
 * - NEVER logs PII from user messages (only metadata)
 * - Hash userId for privacy (SHA-256 first 8 chars)
 * - Structured JSON format for parseability
 * - Log levels: info for success, warn for slow (>2s), error for failures
 *
 * @param params - LLM request parameters to log
 */
export function logLLMRequest(params: LLMLogParams): void {
  const level = determineLogLevel(params)

  const entry: LLMLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event: 'llm_request',
    userId: hashUserId(params.userId),
    endpoint: params.endpoint,
    provider: params.provider,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    cached: params.cached,
    latencyMs: params.latencyMs,
    ...(params.error && { error: sanitizeErrorMessage(params.error) }),
  }

  const logMessage = formatLogEntry(entry)

  // Use appropriate console method based on level
  switch (level) {
    case 'error':
      console.error(logMessage)
      break
    case 'warn':
      console.warn(logMessage)
      break
    default:
      console.log(logMessage)
  }
}

/**
 * Sanitize error messages to remove potential secrets
 */
function sanitizeErrorMessage(error: string): string {
  // Remove any patterns that look like API keys or secrets
  let sanitized = error
  // Remove bearer tokens
  sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9_-]+/gi, 'Bearer [REDACTED]')
  // Remove API key patterns (sk-, pk-, api_, etc.)
  sanitized = sanitized.replace(/\b(sk|pk|api)[-_][a-zA-Z0-9]{20,}\b/gi, '[API_KEY_REDACTED]')
  // Remove base64-like long strings (potential tokens)
  sanitized = sanitized.replace(/[a-zA-Z0-9+/]{40,}={0,2}/g, '[TOKEN_REDACTED]')
  return sanitized
}

/**
 * Keys that should be removed from logged data
 */
const SENSITIVE_KEY_PATTERNS = [
  'key',
  'secret',
  'token',
  'password',
  'auth',
  'credential',
  'bearer',
  'api_key',
  'apikey',
  'access_token',
  'refresh_token',
  'private',
]

/**
 * Regex patterns for PII
 */
const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // Basic phone number patterns
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  // SSN-like patterns
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
}

/**
 * Check if a key name indicates sensitive data
 */
function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase()
  return SENSITIVE_KEY_PATTERNS.some(pattern => lowerKey.includes(pattern))
}

/**
 * Sanitize data for logging by removing sensitive information
 *
 * Security measures:
 * - Removes any key containing 'key', 'secret', 'token', 'password', 'auth'
 * - Truncates long strings to first 50 chars + "..."
 * - Replaces email patterns with "[EMAIL]"
 *
 * @param data - Any data to sanitize
 * @returns Sanitized data safe for logging
 */
export function sanitizeForLogging(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data
  }

  // Handle primitive types
  if (typeof data === 'string') {
    return sanitizeString(data)
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForLogging(item))
  }

  // Handle objects
  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      // Skip sensitive keys entirely
      if (isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]'
        continue
      }
      sanitized[key] = sanitizeForLogging(value)
    }
    return sanitized
  }

  // For other types (functions, symbols, etc.), return placeholder
  return '[UNSUPPORTED_TYPE]'
}

/**
 * Sanitize a string value
 */
function sanitizeString(str: string): string {
  let sanitized = str

  // Replace email patterns
  sanitized = sanitized.replace(PII_PATTERNS.email, '[EMAIL]')

  // Replace phone patterns
  sanitized = sanitized.replace(PII_PATTERNS.phone, '[PHONE]')

  // Replace SSN patterns
  sanitized = sanitized.replace(PII_PATTERNS.ssn, '[SSN]')

  // Truncate long strings
  if (sanitized.length > 50) {
    sanitized = sanitized.slice(0, 50) + '...'
  }

  return sanitized
}

/**
 * Create a request logger middleware-style function
 * Can be used to wrap LLM calls and automatically log them
 */
export function createLLMLogger(userId: string, endpoint: string) {
  const startTime = Date.now()

  return {
    /**
     * Log successful completion
     */
    success(params: {
      provider: string
      inputTokens: number
      outputTokens: number
      cached: boolean
    }) {
      logLLMRequest({
        userId,
        endpoint,
        provider: params.provider,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        cached: params.cached,
        latencyMs: Date.now() - startTime,
      })
    },

    /**
     * Log error
     */
    error(params: { provider: string; error: string }) {
      logLLMRequest({
        userId,
        endpoint,
        provider: params.provider,
        inputTokens: 0,
        outputTokens: 0,
        cached: false,
        latencyMs: Date.now() - startTime,
        error: params.error,
      })
    },
  }
}
