'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Bot, User, CloudOff, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

// =============================================================================
// TYPES
// =============================================================================

interface ModificationResult {
  action: string
  success: boolean
  eventId?: string
  error?: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  modification?: ModificationResult
}

interface LLMStatusResponse {
  available: boolean
  mode?: string
  message?: string
  apiUsage?: {
    used: number
    limit: number
    remaining: number
  }
}

interface ChatboxProps {
  weekStart: Date
  onScheduleChange?: () => void
  className?: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STATUS_CHECK_INTERVAL = 30000 // 30 seconds

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Chatbox - Chat interface for schedule assistance
 *
 * Features:
 * - LLM availability awareness with periodic status checks
 * - Message display with user/assistant distinction
 * - Loading states with typing indicator
 * - Graceful offline mode handling
 * - Auto-scroll to newest messages
 * - Schedule modification result display
 * - Calendar refresh on successful modifications
 */
export function Chatbox({ weekStart, onScheduleChange, className }: ChatboxProps) {
  // State
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [llmStatus, setLlmStatus] = useState<LLMStatusResponse | null>(null)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Check LLM status
  const checkLLMStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/llm/status')
      if (response.ok) {
        const data = await response.json()
        setLlmStatus(data)
      } else {
        setLlmStatus({ available: false, message: 'Unable to check status' })
      }
    } catch {
      setLlmStatus({ available: false, message: 'Network error' })
    } finally {
      setIsCheckingStatus(false)
    }
  }, [])

  // Initial status check and periodic refresh
  useEffect(() => {
    checkLLMStatus()

    const interval = setInterval(checkLLMStatus, STATUS_CHECK_INTERVAL)
    return () => clearInterval(interval)
  }, [checkLLMStatus])

  // Send message to chat API
  const sendMessage = useCallback(async () => {
    const trimmedInput = inputValue.trim()
    if (!trimmedInput || isLoading || !llmStatus?.available) return

    // Add user message to conversation
    const userMessage: Message = {
      role: 'user',
      content: trimmedInput,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setError(null)
    setIsLoading(true)

    try {
      // Format weekStart for context
      const weekStartStr = weekStart.toISOString().split('T')[0]

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedInput,
          weekStart: weekStartStr,
        }),
      })

      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 503) {
          // LLM offline - update status
          setLlmStatus({ available: false, message: 'LLM service unavailable' })
          setError('Chat service is currently unavailable')
        } else if (response.status === 429) {
          // Rate limit exceeded
          const data = await response.json()
          setError(data.error || 'Rate limit exceeded. Try again later.')
        } else {
          const data = await response.json()
          setError(data.error || 'Failed to send message')
        }
        return
      }

      const data = await response.json()

      // Add assistant response to conversation with modification info
      // If message is empty but modification succeeded, use a fallback message
      let messageContent = data.message
      if (!messageContent && data.modification?.success) {
        const fallbackMessages: Record<string, string> = {
          move: "Done! I've updated your schedule.",
          delete: "Done! I've removed that event.",
          feedback: "Got it! I've noted your preference.",
        }
        messageContent = fallbackMessages[data.modification.action] || "Done! I've updated your schedule."
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: messageContent || "I've processed your request.",
        timestamp: new Date().toISOString(),
        modification: data.modification,
      }
      setMessages((prev) => [...prev, assistantMessage])

      // Check if schedule was modified successfully - trigger calendar refresh
      if (data.modification?.success && onScheduleChange) {
        onScheduleChange()
      }
    } catch {
      setError('Network error - please try again')
    } finally {
      setIsLoading(false)
    }
  }, [inputValue, isLoading, llmStatus?.available, weekStart, onScheduleChange])

  // Handle Enter key (Shift+Enter for newline)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    },
    [sendMessage]
  )

  // Format timestamp for display
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  // Get modification status display
  const getModificationDisplay = (modification: ModificationResult) => {
    if (modification.success) {
      const actionText = {
        move: 'Schedule updated',
        delete: 'Event removed',
        feedback: 'Preference saved',
      }[modification.action] || 'Change applied'

      return (
        <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs mt-1">
          <CheckCircle className="h-3 w-3" />
          <span>{actionText}</span>
        </div>
      )
    } else {
      return (
        <div className="flex items-center gap-1 text-destructive text-xs mt-1">
          <XCircle className="h-3 w-3" />
          <span>{modification.error || 'Failed to update'}</span>
        </div>
      )
    }
  }

  // =============================================================================
  // RENDER: Loading state
  // =============================================================================

  if (isCheckingStatus) {
    return (
      <div className={cn('flex flex-col', className)}>
        <div className="flex items-center gap-2 p-4 border-b">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Schedule Assistant</h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </div>
    )
  }

  // =============================================================================
  // RENDER: Offline state
  // =============================================================================

  if (!llmStatus?.available) {
    return (
      <div className={cn('flex flex-col', className)}>
        <div className="flex items-center gap-2 p-4 border-b">
          <Bot className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-muted-foreground">Schedule Assistant</h2>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
          <CloudOff className="h-8 w-8 mb-2" />
          <p className="text-sm font-medium">Chat Unavailable</p>
          <p className="text-xs mt-1">{llmStatus?.message || 'LLM server is offline'}</p>
        </div>

        {/* Disabled input area */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              placeholder="Ask about your schedule..."
              disabled
              className="min-h-[40px] max-h-[80px] resize-none flex-1"
              rows={1}
            />
            <Button size="sm" disabled>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // =============================================================================
  // RENDER: Online state
  // =============================================================================

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b">
        <Bot className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Schedule Assistant</h2>
        {llmStatus.mode && (
          <span className="text-xs text-muted-foreground ml-auto">
            {llmStatus.mode === 'self-hosted' ? 'Local' : llmStatus.mode}
          </span>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Bot className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Ask me anything about your schedule...</p>
            <p className="text-xs mt-2 max-w-[200px]">
              I can help you understand your week, move events, or remember your preferences.
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                'flex gap-2',
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {message.role === 'user' ? (
                  <User className="h-3.5 w-3.5" />
                ) : (
                  <Bot className="h-3.5 w-3.5" />
                )}
              </div>

              {/* Message bubble */}
              <div
                className={cn(
                  'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                <p
                  className={cn(
                    'text-[10px] mt-1',
                    message.role === 'user'
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground'
                  )}
                >
                  {formatTime(message.timestamp)}
                </p>
                {/* Modification status indicator */}
                {message.modification && getModificationDisplay(message.modification)}
              </div>
            </div>
          ))
        )}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex gap-2">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="bg-muted rounded-lg px-3 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 pb-2">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your schedule..."
            disabled={isLoading}
            className="min-h-[40px] max-h-[80px] resize-none flex-1"
            rows={1}
          />
          <Button
            size="sm"
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
