/**
 * Simple in-memory rate limiter
 *
 * For production at scale, use:
 * - Vercel Edge Config with @vercel/edge-config
 * - Upstash Redis with @upstash/ratelimit
 * - Cloudflare Workers KV
 *
 * This implementation is suitable for:
 * - Development
 * - Single-instance deployments
 * - Low-traffic applications
 */

interface RateLimitConfig {
  interval: number  // Time window in ms
  limit: number     // Max requests per window
}

interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number     // Timestamp when limit resets
}

// In-memory store - cleared on restart
const requests = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(
  identifier: string,
  config: RateLimitConfig = { interval: 60000, limit: 10 }
): RateLimitResult {
  const now = Date.now()
  const record = requests.get(identifier)

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    for (const [key, value] of requests.entries()) {
      if (now > value.resetTime) {
        requests.delete(key)
      }
    }
  }

  // No existing record or expired
  if (!record || now > record.resetTime) {
    requests.set(identifier, {
      count: 1,
      resetTime: now + config.interval
    })
    return {
      success: true,
      remaining: config.limit - 1,
      reset: now + config.interval
    }
  }

  // Within window
  if (record.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      reset: record.resetTime
    }
  }

  record.count++
  return {
    success: true,
    remaining: config.limit - record.count,
    reset: record.resetTime
  }
}

// Preset configurations
export const rateLimitPresets = {
  // Auth endpoints: 5 attempts per minute
  auth: { interval: 60000, limit: 5 },
  // API endpoints: 60 requests per minute
  api: { interval: 60000, limit: 60 },
  // Password reset: 3 attempts per 15 minutes
  passwordReset: { interval: 900000, limit: 3 }
}
