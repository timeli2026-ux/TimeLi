/**
 * Anthropic Claude API client module
 * Phase 6.5: Schedule Chat
 *
 * Provides a singleton client for Claude API access.
 * Used for LLM-powered schedule modifications.
 */

import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null

/**
 * Get the Anthropic client instance (singleton pattern)
 *
 * @throws Error if ANTHROPIC_API_KEY is not configured
 */
export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured')
    }
    client = new Anthropic({ apiKey })
  }
  return client
}

/**
 * Check if Anthropic API is configured
 * Useful for conditionally showing chat features
 */
export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}
