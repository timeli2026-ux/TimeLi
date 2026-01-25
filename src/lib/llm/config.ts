/**
 * LLM Configuration
 * Simplified for MVP - Anthropic Claude only
 */

export interface LLMConfig {
  anthropic: {
    apiKey: string | undefined
    model: string
  }
}

/**
 * Get LLM configuration from environment variables
 */
export function getLLMConfig(): LLMConfig {
  return {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
    },
  }
}

/**
 * Check if LLM is configured
 */
export function isLLMConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}
