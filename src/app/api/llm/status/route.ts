/**
 * LLM Status API Endpoint
 * Phase 11: LLM Gateway Activation - Plan 01
 *
 * GET /api/llm/status
 * Returns LLM availability status for UI to check.
 *
 * Simplified: Returns basic Anthropic status (available or not).
 */

import { getLLMStatus } from '@/lib/llm'
import { NextResponse } from 'next/server'

export async function GET() {
  const status = await getLLMStatus()
  return NextResponse.json(status)
}
