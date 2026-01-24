// Usage API endpoint
// Phase 9: Settings & Billing - Plan 03
// GET /api/usage

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUsage, getSubscriptionStatus } from '@/lib/services/usage-service'

export async function GET() {
  try {
    // 1. Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Get subscription status
    const subscription = await getSubscriptionStatus(user.id)

    // 3. Get current usage
    const usage = await getUsage(user.id)

    // 4. Calculate trial days remaining
    let trialDaysRemaining: number | null = null
    if (subscription?.status === 'trialing' && subscription.trialEnd) {
      const now = new Date()
      const diffMs = subscription.trialEnd.getTime() - now.getTime()
      trialDaysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    }

    // 5. Return response
    return NextResponse.json({
      status: subscription?.status ?? 'inactive',
      trialDaysRemaining,
      generations: usage?.generations ?? { used: 0, limit: 200 },
      recalibrations: usage?.recalibrations ?? { used: 0, limit: 500 },
      periodEnd: usage?.periodEnd ?? null,
    })
  } catch (error) {
    console.error('Usage API error:', error)
    return NextResponse.json(
      { error: 'Failed to get usage' },
      { status: 500 }
    )
  }
}
