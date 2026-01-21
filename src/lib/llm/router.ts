/**
 * LLM Router - Provider Selection Logic
 * Phase 6.5: Schedule Chat - Plan 01
 *
 * Routes LLM requests with hybrid fallback strategy:
 * 1. If in schedule window and self-hosted available -> self-hosted vLLM
 * 2. If API fallback enabled and user has remaining quota -> OpenAI API
 * 3. Otherwise -> offline provider (graceful degradation)
 *
 * Supports time-window scheduling for GPU cost optimization.
 */

import { SelfHostedProvider } from './providers/self-hosted'
import { OpenAIProvider } from './providers/openai'
import { OfflineProvider } from './providers/offline'
import { getLLMConfig, isInAvailabilityWindow, getScheduleString } from './config'
import type { LLMProvider, LLMStatus } from './types'

/**
 * Context for user-specific routing decisions
 */
export interface RouterContext {
  userId?: string
  apiUsageRemaining?: number
}

/**
 * Extended status with mode and usage info
 */
export interface ExtendedLLMStatus extends LLMStatus {
  mode: 'self-hosted' | 'api-fallback' | 'offline'
  schedule?: string
  apiUsage?: {
    used: number
    limit: number
    remaining: number
  }
}

/**
 * Get the appropriate LLM provider based on configuration and context
 */
export async function getLLMProvider(context?: RouterContext): Promise<LLMProvider> {
  const config = getLLMConfig()

  // 1. Try self-hosted if configured and in schedule window
  if (config.selfHosted.baseUrl && config.selfHosted.model) {
    const inWindow = isInAvailabilityWindow(config.selfHosted.schedule)

    if (inWindow) {
      const selfHosted = new SelfHostedProvider(
        config.selfHosted.baseUrl,
        config.selfHosted.model
      )

      if (await selfHosted.isAvailable()) {
        return selfHosted
      }
      // In window but not available - GPU might be starting up
    }
  }

  // 2. Try API fallback if enabled and user has remaining quota
  if (config.apiFallback.enabled && config.apiFallback.apiKey) {
    const remaining = context?.apiUsageRemaining ?? config.apiFallback.dailyLimit

    if (remaining > 0) {
      return new OpenAIProvider(config.apiFallback.apiKey, config.apiFallback.model)
    }
  }

  // 3. Return offline provider with helpful message
  const schedule = config.selfHosted.schedule
  const scheduleStr = getScheduleString(schedule)

  let message: string
  if (config.apiFallback.enabled && context?.apiUsageRemaining === 0) {
    message = `Daily chat limit reached. Full chat available ${scheduleStr}.`
  } else if (config.selfHosted.baseUrl) {
    message = `Chat offline. Available ${scheduleStr}.`
  } else {
    message = 'Chat is not configured.'
  }

  return new OfflineProvider(message)
}

/**
 * Get LLM status with mode and usage information
 */
export async function getLLMStatus(context?: RouterContext): Promise<ExtendedLLMStatus> {
  const config = getLLMConfig()
  const provider = await getLLMProvider(context)
  const baseStatus = await provider.getStatus()

  // Determine mode based on provider type
  let mode: 'self-hosted' | 'api-fallback' | 'offline' = 'offline'
  const providerName = provider.getName()

  if (providerName === 'self-hosted-vllm') {
    mode = 'self-hosted'
  } else if (providerName === 'openai-api') {
    mode = 'api-fallback'
  }

  // Build extended status
  const status: ExtendedLLMStatus = {
    ...baseStatus,
    mode,
    schedule: getScheduleString(config.selfHosted.schedule),
  }

  // Add API usage if context provided
  if (context?.apiUsageRemaining !== undefined) {
    status.apiUsage = {
      used: config.apiFallback.dailyLimit - context.apiUsageRemaining,
      limit: config.apiFallback.dailyLimit,
      remaining: context.apiUsageRemaining,
    }
  }

  return status
}
