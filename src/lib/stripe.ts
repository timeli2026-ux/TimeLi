import 'server-only'

import Stripe from 'stripe'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'

// =============================================================================
// STRIPE CLIENT INITIALIZATION
// =============================================================================

/**
 * Initialize Stripe client. Returns null if not configured.
 * Uses 'server-only' package to prevent client-side import.
 */
function getStripeClient(): Stripe | null {
  if (!env.STRIPE_SECRET_KEY) {
    return null
  }

  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-12-15.clover',
    typescript: true,
  })
}

export const stripe = getStripeClient()

// =============================================================================
// CUSTOMER MANAGEMENT
// =============================================================================

/**
 * Get or create a Stripe customer for a user.
 * Stores stripe_customer_id in subscriptions table.
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string
): Promise<string | null> {
  if (!stripe) {
    console.error('Stripe not configured')
    return null
  }

  const supabase = await createClient()

  // Check if user already has a Stripe customer ID
  const { data: subscription } = await (supabase as any)
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single()

  if (subscription?.stripe_customer_id) {
    return subscription.stripe_customer_id
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  })

  // Upsert subscription record with customer ID
  const { error } = await (supabase as any)
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: customer.id,
      status: 'inactive',
    }, {
      onConflict: 'user_id',
    })

  if (error) {
    console.error('Error storing customer ID:', error)
    // Customer was created in Stripe, so return ID anyway
  }

  return customer.id
}

// =============================================================================
// CHECKOUT SESSION
// =============================================================================

/**
 * Create a checkout session for subscription with 30-day trial.
 */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string | null> {
  if (!stripe) {
    console.error('Stripe not configured')
    return null
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: 30,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  })

  return session.url
}

// =============================================================================
// BILLING PORTAL
// =============================================================================

/**
 * Create a billing portal session for managing subscription.
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string | null> {
  if (!stripe) {
    console.error('Stripe not configured')
    return null
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return session.url
}

// =============================================================================
// SUBSCRIPTION SYNC
// =============================================================================

/**
 * Sync subscription status from Stripe to local database.
 * Uses service role client to bypass RLS (called from webhooks without user context).
 */
export async function syncSubscriptionStatus(
  subscriptionId: string
): Promise<void> {
  if (!stripe) {
    console.error('Stripe not configured')
    return
  }

  // Retrieve subscription with items expanded to get current period dates
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data'],
  })

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id

  // Use service role client to bypass RLS (webhook has no user context)
  const supabase = createServiceRoleClient()

  // Map Stripe status to our status
  let status: 'inactive' | 'trialing' | 'active' | 'canceled' | 'past_due' = 'inactive'
  switch (subscription.status) {
    case 'trialing':
      status = 'trialing'
      break
    case 'active':
      status = 'active'
      break
    case 'canceled':
      status = 'canceled'
      break
    case 'past_due':
    case 'incomplete':
    case 'incomplete_expired':
      status = 'past_due'
      break
    default:
      status = 'inactive'
  }

  // Get period dates from first subscription item (all items share same billing period)
  const firstItem = subscription.items.data[0]
  const currentPeriodStart = firstItem?.current_period_start
  const currentPeriodEnd = firstItem?.current_period_end

  // Update subscription record by customer ID (since subscription ID may not be set yet on first sync)
  const { error } = await (supabase as any)
    .from('subscriptions')
    .update({
      stripe_subscription_id: subscription.id,
      status,
      trial_start: subscription.trial_start
        ? new Date(subscription.trial_start * 1000).toISOString()
        : null,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      current_period_start: currentPeriodStart
        ? new Date(currentPeriodStart * 1000).toISOString()
        : null,
      current_period_end: currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('Error syncing subscription status:', error)
  }
}

// =============================================================================
// SUBSCRIPTION CANCELLATION
// =============================================================================

/**
 * Cancel a Stripe subscription.
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<void> {
  if (!stripe) {
    console.error('Stripe not configured')
    return
  }

  await stripe.subscriptions.cancel(subscriptionId)
}

// =============================================================================
// HELPER: Check if Stripe is configured
// =============================================================================

export function isStripeConfigured(): boolean {
  return stripe !== null
}
