/**
 * LLM Status API Endpoint
 * Phase 6.5: Schedule Chat - Plan 01
 *
 * GET /api/llm/status
 * Returns LLM availability status for UI to check.
 *
 * No auth required - just returns availability status.
 * The chatbox UI calls this on mount to know whether to show
 * enabled or disabled state.
 */

import { getLLMStatus } from '@/lib/llm'
import { NextResponse } from 'next/server'

export async function GET() {
  const status = await getLLMStatus()
  return NextResponse.json(status)
}
