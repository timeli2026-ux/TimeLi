/**
 * LLM Status API Endpoint
 * Phase 6.5: Schedule Chat - Plan 01
 *
 * GET /api/llm/status
 * Returns LLM availability status for UI to check.
 *
 * For authenticated users:
 * - Returns API usage info (used/limit/remaining)
 * - Shows current mode (self-hosted/api-fallback/offline)
 *
 * For anonymous users:
 * - Returns basic status without usage info
 */

import { createClient } from '@/lib/supabase/server'
import { getLLMStatus } from '@/lib/llm'
import { getApiUsage } from '@/lib/services/api-usage'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Build router context for authenticated users
  let context = undefined
  if (user) {
    const usage = await getApiUsage(supabase, user.id)
    context = {
      userId: user.id,
      apiUsageRemaining: usage.remaining,
    }
  }

  const status = await getLLMStatus(context)
  return NextResponse.json(status)
}
