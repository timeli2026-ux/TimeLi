/**
 * LLM Response Cache
 * Phase 8: LLM Gateway - Plan 01
 *
 * In-memory LRU cache for LLM responses with TTL.
 * Reduces costs by caching identical requests.
 *
 * Configuration:
 * - Max entries: 100 (LRU eviction)
 * - TTL: 5 minutes (per PRD deduplication spec)
 *
 * Note: In-memory is fine for dev. For production at scale,
 * would use Upstash Redis (Phase 10 scope).
 */

import { createHash } from 'crypto'
import type { ChatMessage, ChatResponse } from './types'

interface CacheEntry {
  response: ChatResponse
  timestamp: number
}

// Cache configuration
const MAX_ENTRIES = 100
const TTL_MS = 5 * 60 * 1000 // 5 minutes

// In-memory cache store
const cache = new Map<string, CacheEntry>()

/**
 * Generate a cache key from messages using SHA-256 hash
 * Key is based on systemPrompt + userMessage content
 */
export function generateCacheKey(messages: ChatMessage[]): string {
  // Concatenate all message content for hashing
  const content = messages
    .map((m) => `${m.role}:${m.content}`)
    .join('|')

  return createHash('sha256').update(content).digest('hex')
}

/**
 * Prune expired entries and enforce LRU eviction
 */
function pruneCache(): void {
  const now = Date.now()

  // First, remove expired entries
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > TTL_MS) {
      cache.delete(key)
    }
  }

  // Then, enforce max size (LRU eviction - delete oldest)
  if (cache.size > MAX_ENTRIES) {
    // Map preserves insertion order, so first entries are oldest
    const keysToDelete = Array.from(cache.keys()).slice(0, cache.size - MAX_ENTRIES)
    for (const key of keysToDelete) {
      cache.delete(key)
    }
  }
}

/**
 * Get a cached response if available and not expired
 * Returns null if not found or expired
 */
export function getCached(key: string): ChatResponse | null {
  pruneCache()

  const entry = cache.get(key)
  if (!entry) {
    return null
  }

  // Check TTL
  if (Date.now() - entry.timestamp > TTL_MS) {
    cache.delete(key)
    return null
  }

  // Move to end for LRU (delete and re-add)
  cache.delete(key)
  cache.set(key, entry)

  return entry.response
}

/**
 * Store a response in the cache
 */
export function setCached(key: string, response: ChatResponse): void {
  pruneCache()

  // If key exists, delete first to update position
  if (cache.has(key)) {
    cache.delete(key)
  }

  cache.set(key, {
    response,
    timestamp: Date.now(),
  })
}

/**
 * Clear all cache entries (useful for testing)
 */
export function clearCache(): void {
  cache.clear()
}

/**
 * Get cache statistics (useful for debugging)
 */
export function getCacheStats(): { size: number; maxSize: number; ttlMs: number } {
  return {
    size: cache.size,
    maxSize: MAX_ENTRIES,
    ttlMs: TTL_MS,
  }
}
