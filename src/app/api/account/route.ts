import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cancelSubscription, isStripeConfigured } from '@/lib/stripe'

// =============================================================================
// DELETE /api/account - Delete user account
// =============================================================================

export async function DELETE() {
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

    // Check for active Stripe subscription and cancel if exists
    if (isStripeConfigured()) {
      const { data: subscription } = await (supabase as any)
        .from('subscriptions')
        .select('stripe_subscription_id, status')
        .eq('user_id', user.id)
        .single()

      // Cancel Stripe subscription if active or trialing
      if (subscription?.stripe_subscription_id &&
          (subscription.status === 'active' || subscription.status === 'trialing')) {
        try {
          await cancelSubscription(subscription.stripe_subscription_id)
        } catch (error) {
          console.error('Error canceling Stripe subscription:', error)
          // Continue with account deletion even if Stripe cancellation fails
          // The webhook will handle the cancellation status update
        }
      }
    }

    // Delete user from auth.users (cascades to all tables via FK constraints)
    // Using admin API to delete the user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
