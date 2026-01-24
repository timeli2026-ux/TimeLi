import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPortalSession, isStripeConfigured } from '@/lib/stripe'

// =============================================================================
// POST /api/billing/portal - Create Stripe billing portal session
// =============================================================================

export async function POST(request: Request) {
  try {
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Billing not configured' },
        { status: 503 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get customer ID from subscriptions table
    const { data: subscription, error: subError } = await (supabase as any)
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (subError || !subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      )
    }

    // Get request origin for return URL
    const origin = request.headers.get('origin') || 'http://localhost:3000'
    const returnUrl = `${origin}/settings/subscription`

    // Create portal session
    const portalUrl = await createPortalSession(
      subscription.stripe_customer_id,
      returnUrl
    )

    if (!portalUrl) {
      return NextResponse.json(
        { error: 'Failed to create portal session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: portalUrl })
  } catch (error) {
    console.error('Create portal error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
