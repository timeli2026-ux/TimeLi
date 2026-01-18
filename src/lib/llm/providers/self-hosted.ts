/**
 * Self-Hosted vLLM Provider
 * Phase 6.5: Schedule Chat - Plan 01
 *
 * Connects to a self-hosted vLLM instance (e.g., on RunPod/Lambda Labs).
 * Features:
 * - Health check with 2s timeout (doesn't block requests)
 * - 30s availability cache (reduces health check calls)
 * - OpenAI-compatible API format (works with vLLM, text-generation-inference, ollama)
 */

import type { LLMProvider, ChatMessage, ChatOptions, ChatResponse, LLMStatus } from '../types'

export class SelfHostedProvider implements LLMProvider {
  private baseUrl: string
  private model: string
  private availabilityCache: { available: boolean; checkedAt: number } | null = null
  private readonly CACHE_TTL_MS = 30000  // Cache health status for 30s

  constructor(baseUrl: string, model: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')  // Remove trailing slash
    this.model = model
  }

  getName(): string {
    return 'self-hosted-vllm'
  }

  async isAvailable(): Promise<boolean> {
    // Return cached result if fresh
    if (this.availabilityCache && Date.now() - this.availabilityCache.checkedAt < this.CACHE_TTL_MS) {
      return this.availabilityCache.available
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000)  // 2s timeout

      const res = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      const available = res.ok
      this.availabilityCache = { available, checkedAt: Date.now() }
      return available
    } catch {
      this.availabilityCache = { available: false, checkedAt: Date.now() }
      return false
    }
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    // OpenAI-compatible API (vLLM exposes this format)
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: options?.maxTokens ?? 500,
        temperature: options?.temperature ?? 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`LLM request failed: ${response.status} ${error}`)
    }

    const data = await response.json()
    return {
      content: data.choices[0].message.content,
      provider: this.getName(),
      tokensUsed: data.usage?.total_tokens,
    }
  }

  async getStatus(): Promise<LLMStatus> {
    const available = await this.isAvailable()
    return {
      available,
      provider: this.getName(),
      message: available ? undefined : 'Chat is currently offline',
    }
  }
}
