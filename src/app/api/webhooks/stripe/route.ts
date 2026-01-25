import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import Stripe from 'stripe'
import { stripe, syncSubscriptionStatus } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'

// =============================================================================
// STRIPE WEBHOOK HANDLER
// =============================================================================

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events with signature verification.
 *
 * Security (SEC-12): Verifies webhook signature to ensure requests are from Stripe.
 */
export async function POST(request: Request) {
  // Stripe must be configured
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 500 }
    )
  }

  if (!env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  // CRITICAL: Get raw body for signature verification
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    console.error('Missing stripe-signature header')
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    )
  }

  // Verify webhook signature
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  // Log event type (SEC-16: never log full payload)
  console.log('Stripe webhook event:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log('Unhandled event type:', event.type)
    }

    // Revalidate subscription page cache after any subscription-related event
    revalidatePath('/settings/subscription')
    revalidatePath('/(protected)/settings/subscription')

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Handle checkout.session.completed event.
 * Links Stripe customer to user and creates subscription record.
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  if (!customerId || !subscriptionId) {
    console.error('Missing customer or subscription ID in checkout session')
    return
  }

  console.log('Checkout completed for subscription:', subscriptionId)

  // Sync subscription status from Stripe
  await syncSubscriptionStatus(subscriptionId)
}

/**
 * Handle customer.subscription.created event.
 * Sets status to 'trialing' and records trial dates.
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  console.log('Subscription created:', subscription.id)

  // Use service role client to bypass RLS (webhook has no user context)
  const supabase = createServiceRoleClient()

  // Get period dates from first subscription item
  const firstItem = subscription.items.data[0]
  const currentPeriodStart = firstItem?.current_period_start
  const currentPeriodEnd = firstItem?.current_period_end

  // Update subscription record with Stripe subscription ID and dates
  const { error } = await (supabase as any)
    .from('subscriptions')
    .update({
      stripe_subscription_id: subscription.id,
      status: subscription.status === 'trialing' ? 'trialing' : 'active',
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
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('Error updating subscription:', error)
    // Log hashed user info for debugging (SEC-16)
    console.error('Customer:', customerId)
  }
}

/**
 * Handle customer.subscription.updated event.
 * Updates status (trialing -> active, active -> past_due, etc.) and period dates.
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id, 'Status:', subscription.status)

  // Sync full subscription status from Stripe
  await syncSubscriptionStatus(subscription.id)
}

/**
 * Handle customer.subscription.deleted event.
 * Sets status to 'canceled'.
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id)

  // Use service role client to bypass RLS (webhook has no user context)
  const supabase = createServiceRoleClient()

  const { error } = await (supabase as any)
    .from('subscriptions')
    .update({
      status: 'canceled',
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error updating subscription to canceled:', error)
  }
}

/**
 * Handle invoice.paid event.
 * Logs successful payment for future analytics.
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // In newer Stripe API, subscription is accessed via parent.subscription_details
  const subscriptionDetails = invoice.parent?.subscription_details
  const subscriptionId = typeof subscriptionDetails?.subscription === 'string'
    ? subscriptionDetails.subscription
    : subscriptionDetails?.subscription?.id

  if (!subscriptionId) {
    // One-time invoice, not subscription-related
    return
  }

  // Log payment success (SEC-16: only log IDs, not amounts or PII)
  console.log('Invoice paid for subscription:', subscriptionId)

  // Ensure subscription status is up to date
  await syncSubscriptionStatus(subscriptionId)
}

/**
 * Handle invoice.payment_failed event.
 * Sets status to 'past_due'.
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // In newer Stripe API, subscription is accessed via parent.subscription_details
  const subscriptionDetails = invoice.parent?.subscription_details
  const subscriptionId = typeof subscriptionDetails?.subscription === 'string'
    ? subscriptionDetails.subscription
    : subscriptionDetails?.subscription?.id

  if (!subscriptionId) {
    return
  }

  console.log('Invoice payment failed for subscription:', subscriptionId)

  // Use service role client to bypass RLS (webhook has no user context)
  const supabase = createServiceRoleClient()

  const { error } = await (supabase as any)
    .from('subscriptions')
    .update({
      status: 'past_due',
    })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) {
    console.error('Error updating subscription to past_due:', error)
  }
}
