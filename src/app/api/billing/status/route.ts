import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// GET /api/billing/status - Get current subscription status
// =============================================================================

export async function GET() {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get subscription data
    const { data: subscription, error: subError } = await (supabase as any)
      .from('subscriptions')
      .select('status, trial_end, current_period_end, cancel_at_period_end, price_cents')
      .eq('user_id', user.id)
      .single()

    if (subError && subError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is fine
      console.error('Error fetching subscription:', subError)
      return NextResponse.json(
        { error: 'Failed to fetch subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: subscription?.status || 'inactive',
      trialEnd: subscription?.trial_end || null,
      currentPeriodEnd: subscription?.current_period_end || null,
      cancelAtPeriodEnd: subscription?.cancel_at_period_end || false,
      priceCents: subscription?.price_cents || 1500,
    })
  } catch (error) {
    console.error('Get subscription status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
