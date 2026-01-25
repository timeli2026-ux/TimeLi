/**
 * Anthropic Claude API Provider
 * Phase 8: LLM Gateway - Plan 01
 *
 * Primary LLM provider using Claude for structured outputs.
 * Model: claude-3-haiku-20240307 (fast, cost-effective for structured tasks).
 */

import Anthropic from '@anthropic-ai/sdk'
import { getLLMConfig } from '../config'
import type { LLMProvider, ChatMessage, ChatOptions, ChatResponse, LLMStatus } from '../types'

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic | null = null
  private model: string

  constructor(model?: string) {
    const config = getLLMConfig()
    this.model = model || config.anthropic.model
  }

  /**
   * Get or create the Anthropic client (lazy initialization)
   */
  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        throw new Error('Anthropic API key not configured')
      }
      this.client = new Anthropic({ apiKey })
    }
    return this.client
  }

  getName(): string {
    return 'anthropic-claude'
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.ANTHROPIC_API_KEY
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const client = this.getClient()

    // Convert messages to Anthropic format
    // Anthropic requires system message to be passed separately
    let systemPrompt: string | undefined
    const anthropicMessages: Array<{ role: 'user' | 'assistant'; content: string }> = []

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt = msg.content
      } else {
        anthropicMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })
      }
    }

    try {
      const response = await client.messages.create({
        model: this.model,
        max_tokens: options?.maxTokens ?? 500,
        ...(systemPrompt && { system: systemPrompt }),
        messages: anthropicMessages,
      })

      // Extract text content from response
      const content = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('')

      // Calculate total tokens used
      const tokensUsed = response.usage.input_tokens + response.usage.output_tokens

      return {
        content,
        provider: this.getName(),
        tokensUsed,
      }
    } catch (error) {
      // Sanitize error message to avoid leaking API key
      const message = error instanceof Error ? error.message : 'Unknown error'
      const sanitizedMessage = message.replace(/sk-[a-zA-Z0-9-]+/g, '[REDACTED]')
      throw new Error(`Anthropic API error: ${sanitizedMessage}`)
    }
  }

  async getStatus(): Promise<LLMStatus> {
    return {
      available: await this.isAvailable(),
      provider: this.getName(),
      message: 'Using Anthropic Claude API',
    }
  }
}
