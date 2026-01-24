import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateCustomer, createCheckoutSession, isStripeConfigured } from '@/lib/stripe'
import { env } from '@/lib/env'

// =============================================================================
// POST /api/billing/create-checkout - Create Stripe checkout session
// =============================================================================

export async function POST(request: Request) {
  try {
    // Check if Stripe is configured
    if (!isStripeConfigured() || !env.STRIPE_PRICE_ID) {
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

    // Get or create Stripe customer
    const customerId = await getOrCreateCustomer(user.id, user.email || '')

    if (!customerId) {
      return NextResponse.json(
        { error: 'Failed to create customer' },
        { status: 500 }
      )
    }

    // Get request origin for success/cancel URLs
    const origin = request.headers.get('origin') || 'http://localhost:3000'
    const successUrl = `${origin}/settings/subscription?success=true`
    const cancelUrl = `${origin}/settings/subscription?canceled=true`

    // Create checkout session with 30-day trial
    const checkoutUrl = await createCheckoutSession(
      customerId,
      env.STRIPE_PRICE_ID,
      successUrl,
      cancelUrl
    )

    if (!checkoutUrl) {
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: checkoutUrl })
  } catch (error) {
    console.error('Create checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
