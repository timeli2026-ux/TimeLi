import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Settings, Target, User, CreditCard, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SubscriptionSection } from '@/components/settings/subscription-section'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// DATA FETCHING
// =============================================================================

interface SubscriptionData {
  status: 'inactive' | 'trialing' | 'active' | 'canceled' | 'past_due'
  trialEnd: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  priceCents: number
}

async function getSubscriptionData(): Promise<SubscriptionData> {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // Get subscription data
  const { data: subscription } = await (supabase as any)
    .from('subscriptions')
    .select('status, trial_end, current_period_end, cancel_at_period_end, price_cents')
    .eq('user_id', user.id)
    .single()

  return {
    status: subscription?.status || 'inactive',
    trialEnd: subscription?.trial_end || null,
    currentPeriodEnd: subscription?.current_period_end || null,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end || false,
    priceCents: subscription?.price_cents || 1500,
  }
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default async function SubscriptionPage() {
  const subscriptionData = await getSubscriptionData()

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container py-6">
          {/* Back link */}
          <Link
            href="/calendar"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Calendar
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <CreditCard className="h-6 w-6" />
                Subscription
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your subscription and billing
              </p>
            </div>
          </div>

          {/* Settings Navigation Tabs */}
          <div className="flex gap-1 mt-6 -mb-px">
            <Link href="/settings/preferences">
              <Button
                variant="ghost"
                className="rounded-b-none border-b-2 border-transparent text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-4 w-4 mr-2" />
                Preferences
              </Button>
            </Link>
            <Link href="/goals">
              <Button
                variant="ghost"
                className="rounded-b-none border-b-2 border-transparent text-muted-foreground hover:text-foreground"
              >
                <Target className="h-4 w-4 mr-2" />
                Goals
              </Button>
            </Link>
            <Link href="/settings/account">
              <Button
                variant="ghost"
                className="rounded-b-none border-b-2 border-transparent text-muted-foreground hover:text-foreground"
              >
                <User className="h-4 w-4 mr-2" />
                Account
              </Button>
            </Link>
            <Link href="/settings/subscription">
              <Button
                variant="ghost"
                className="rounded-b-none border-b-2 border-primary text-foreground"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Subscription
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 container py-6">
        <div className="max-w-2xl mx-auto">
          <SubscriptionSection
            status={subscriptionData.status}
            trialEnd={subscriptionData.trialEnd}
            currentPeriodEnd={subscriptionData.currentPeriodEnd}
            cancelAtPeriodEnd={subscriptionData.cancelAtPeriodEnd}
            priceCents={subscriptionData.priceCents}
          />
        </div>
      </div>
    </div>
  )
}
