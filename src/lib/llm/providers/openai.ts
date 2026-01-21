/**
 * OpenAI API Provider (Fallback)
 * Phase 6.5: Schedule Chat - Plan 01
 *
 * Used as fallback when self-hosted vLLM is unavailable.
 * Default model: gpt-4o-mini (cost-effective for chat).
 * Subject to daily per-user rate limits.
 */

import type { LLMProvider, ChatMessage, ChatOptions, ChatResponse, LLMStatus } from '../types'

export class OpenAIProvider implements LLMProvider {
  private apiKey: string
  private model: string

  constructor(apiKey: string, model: string = 'gpt-4o-mini') {
    this.apiKey = apiKey
    this.model = model
  }

  getName(): string {
    return 'openai-api'
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: options?.maxTokens ?? 500,
        temperature: options?.temperature ?? 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} ${error}`)
    }

    const data = await response.json()
    return {
      content: data.choices[0].message.content,
      provider: this.getName(),
      tokensUsed: data.usage?.total_tokens,
    }
  }

  async getStatus(): Promise<LLMStatus> {
    return {
      available: await this.isAvailable(),
      provider: this.getName(),
      message: 'Using API fallback (limited daily quota)',
    }
  }
}
