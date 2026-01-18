/**
 * Conversation Service
 * Phase 6.5: Schedule Chat - Plan 01
 *
 * Manages chat history persistence using schedule_conversations table.
 * Provides functions to:
 * - Get or create conversation for user/week
 * - Add messages to conversation
 * - Convert stored messages to LLM format
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChatMessage } from '../llm/types'

// Stored message format (matches schedule_conversations.messages JSONB)
export interface StoredMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface Conversation {
  id: string
  messages: StoredMessage[]
}

/**
 * Gets existing conversation or creates new one for user/week
 */
export async function getOrCreateConversation(
  supabase: SupabaseClient,
  userId: string,
  weekStart: string
): Promise<Conversation> {
  // Type assertion until types regenerated after migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: selectError } = await (supabase as any)
    .from('schedule_conversations')
    .select('id, messages')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .single()

  if (existing && !selectError) {
    return {
      id: existing.id,
      messages: (existing.messages || []) as StoredMessage[],
    }
  }

  // Create new conversation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: created, error: insertError } = await (supabase as any)
    .from('schedule_conversations')
    .insert({
      user_id: userId,
      week_start: weekStart,
      messages: [],
    })
    .select('id, messages')
    .single()

  if (insertError) {
    throw new Error(`Failed to create conversation: ${insertError.message}`)
  }

  return {
    id: created.id,
    messages: [],
  }
}

/**
 * Appends a message to an existing conversation
 */
export async function addMessage(
  supabase: SupabaseClient,
  conversationId: string,
  message: StoredMessage
): Promise<void> {
  // First get current messages
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current, error: selectError } = await (supabase as any)
    .from('schedule_conversations')
    .select('messages')
    .eq('id', conversationId)
    .single()

  if (selectError) {
    throw new Error(`Failed to get conversation: ${selectError.message}`)
  }

  const messages = [...(current.messages || []), message]

  // Update with appended message
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('schedule_conversations')
    .update({ messages, updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  if (updateError) {
    throw new Error(`Failed to add message: ${updateError.message}`)
  }
}

/**
 * Convert stored messages to LLM format with system prompt
 */
export function toPromptMessages(
  messages: StoredMessage[],
  systemPrompt: string
): ChatMessage[] {
  return [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ]
}
