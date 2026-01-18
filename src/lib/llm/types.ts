/**
 * LLM Provider Types and Interfaces
 * Phase 6.5: Schedule Chat - Plan 01
 *
 * These interfaces allow swapping providers (self-hosted, API, offline)
 * without changing consumer code.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  maxTokens?: number
  temperature?: number
}

export interface ChatResponse {
  content: string
  provider: string
  tokensUsed?: number
}

export interface LLMStatus {
  available: boolean
  provider: string
  message?: string  // e.g., "Chat available 9am-2pm EST"
}

export interface LLMProvider {
  getName(): string
  isAvailable(): Promise<boolean>
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>
  getStatus(): Promise<LLMStatus>
}
