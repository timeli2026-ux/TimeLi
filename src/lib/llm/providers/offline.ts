/**
 * Offline Provider for Graceful Degradation
 * Phase 6.5: Schedule Chat - Plan 01
 *
 * Used when the self-hosted LLM is unavailable.
 * Returns a friendly offline message - doesn't call any API.
 */

import type { LLMProvider, ChatMessage, ChatOptions, ChatResponse, LLMStatus } from '../types'

export class OfflineProvider implements LLMProvider {
  private offlineMessage: string

  constructor(offlineMessage?: string) {
    this.offlineMessage = offlineMessage ?? 'Chat is currently unavailable. Please try again later.'
  }

  getName(): string {
    return 'offline'
  }

  async isAvailable(): Promise<boolean> {
    return true  // Always "available" as a fallback
  }

  async chat(_messages: ChatMessage[], _options?: ChatOptions): Promise<ChatResponse> {
    // Don't actually process - return offline message
    return {
      content: this.offlineMessage,
      provider: this.getName(),
    }
  }

  async getStatus(): Promise<LLMStatus> {
    return {
      available: false,  // Report as unavailable so UI can show disabled state
      provider: this.getName(),
      message: this.offlineMessage,
    }
  }
}
