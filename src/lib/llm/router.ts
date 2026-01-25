/**
 * LLM Router - Provider Selection Logic
 * Phase 11: LLM Gateway Activation - Plan 01
 *
 * Simplified for MVP: Anthropic Claude API + offline fallback.
 * No multi-provider routing, time-window scheduling, or API fallback tracking.
 */

import { AnthropicProvider } from './providers/anthropic'
import { OfflineProvider } from './providers/offline'
import type { LLMProvider, LLMStatus, ChatMessage } from './types'

/**
 * Get the appropriate LLM provider based on configuration
 */
export async function getLLMProvider(): Promise<LLMProvider> {
  // Try Anthropic if configured
  if (process.env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider()
  }

  // Fallback to offline mode
  return new OfflineProvider('LLM not configured. Set ANTHROPIC_API_KEY in environment.')
}

/**
 * Get LLM status
 */
export async function getLLMStatus(): Promise<LLMStatus> {
  const provider = await getLLMProvider()
  return provider.getStatus()
}

/**
 * Estimate token count for messages
 * Uses tiktoken-like estimation: ~4 characters per token (or words / 0.75)
 *
 * This is a rough approximation - actual token counts vary by model and content.
 * For accurate counts, use the model's tokenizer directly.
 */
export function estimateTokens(messages: ChatMessage[]): number {
  let totalChars = 0

  for (const message of messages) {
    // Add role token overhead (~4 tokens per message for role/formatting)
    totalChars += 16 // ~4 tokens overhead

    // Count content characters
    totalChars += message.content.length
  }

  // Rough estimate: 4 characters per token
  // This is conservative for English text (actual is often ~3.5-4.5)
  return Math.ceil(totalChars / 4)
}

/**
 * Estimate output tokens based on max tokens and typical response patterns
 * This helps with pre-flight budget checks
 */
export function estimateOutputTokens(maxTokens?: number): number {
  // If maxTokens is set, assume we might use up to 80% of it
  if (maxTokens) {
    return Math.ceil(maxTokens * 0.8)
  }

  // Default estimate for typical responses
  return 200
}
