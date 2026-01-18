/**
 * LLM Router - Provider Selection Logic
 * Phase 6.5: Schedule Chat - Plan 01
 *
 * Routes LLM requests to the appropriate provider:
 * 1. If LLM_BASE_URL and LLM_MODEL configured and available -> self-hosted vLLM
 * 2. Otherwise -> offline provider (graceful degradation)
 *
 * Caches provider decision for 30s to reduce health check calls.
 */

import { SelfHostedProvider } from './providers/self-hosted'
import { OfflineProvider } from './providers/offline'
import type { LLMProvider, LLMStatus } from './types'

let cachedProvider: LLMProvider | null = null
let providerResolvedAt = 0
const PROVIDER_CACHE_TTL_MS = 30000  // Re-check every 30s

export async function getLLMProvider(): Promise<LLMProvider> {
  // Return cached if fresh
  if (cachedProvider && Date.now() - providerResolvedAt < PROVIDER_CACHE_TTL_MS) {
    return cachedProvider
  }

  const baseUrl = process.env.LLM_BASE_URL
  const model = process.env.LLM_MODEL

  // If not configured, return offline provider
  if (!baseUrl || !model) {
    cachedProvider = new OfflineProvider('Chat is not configured. LLM_BASE_URL and LLM_MODEL required.')
    providerResolvedAt = Date.now()
    return cachedProvider
  }

  const selfHosted = new SelfHostedProvider(baseUrl, model)

  if (await selfHosted.isAvailable()) {
    cachedProvider = selfHosted
    providerResolvedAt = Date.now()
    return cachedProvider
  }

  // Self-hosted is down, use offline provider
  cachedProvider = new OfflineProvider()
  providerResolvedAt = Date.now()
  return cachedProvider
}

export async function getLLMStatus(): Promise<LLMStatus> {
  const provider = await getLLMProvider()
  return provider.getStatus()
}
