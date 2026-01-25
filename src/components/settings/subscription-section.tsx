'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CreditCard, Loader2, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

// =============================================================================
// TYPES
// =============================================================================

interface SubscriptionSectionProps {
  status: 'inactive' | 'trialing' | 'active' | 'canceled' | 'past_due'
  trialEnd: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  priceCents: number
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function getStatusBadge(status: string, cancelAtPeriodEnd: boolean) {
  if (cancelAtPeriodEnd) {
    return (
      <Badge variant="outline" className="text-amber-600 border-amber-600">
        <Clock className="h-3 w-3 mr-1" />
        Canceling
      </Badge>
    )
  }

  switch (status) {
    case 'active':
      return (
        <Badge variant="outline" className="text-green-600 border-green-600">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Active
        </Badge>
      )
    case 'trialing':
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-600">
          <Clock className="h-3 w-3 mr-1" />
          Free Trial
        </Badge>
      )
    case 'canceled':
      return (
        <Badge variant="outline" className="text-gray-600 border-gray-600">
          <XCircle className="h-3 w-3 mr-1" />
          Canceled
        </Badge>
      )
    case 'past_due':
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Past Due
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary">
          Inactive
        </Badge>
      )
  }
}

// =============================================================================
// SUBSCRIPTION SECTION COMPONENT
// =============================================================================

export function SubscriptionSection({
  status: initialStatus,
  trialEnd: initialTrialEnd,
  currentPeriodEnd: initialCurrentPeriodEnd,
  cancelAtPeriodEnd: initialCancelAtPeriodEnd,
  priceCents: initialPriceCents,
}: SubscriptionSectionProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [stripeConfigured, setStripeConfigured] = useState(true)
  const [isPolling, setIsPolling] = useState(false)

  // Use state for subscription data to allow updates from polling
  const [subscriptionData, setSubscriptionData] = useState({
    status: initialStatus,
    trialEnd: initialTrialEnd,
    currentPeriodEnd: initialCurrentPeriodEnd,
    cancelAtPeriodEnd: initialCancelAtPeriodEnd,
    priceCents: initialPriceCents,
  })

  const { status, trialEnd, currentPeriodEnd, cancelAtPeriodEnd, priceCents } = subscriptionData

  // Poll for subscription status updates
  const pollSubscriptionStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/billing/status')
      if (!response.ok) return null
      return await response.json()
    } catch {
      return null
    }
  }, [])

  // Handle success/cancel from Stripe redirect with polling
  useEffect(() => {
    if (searchParams.get('canceled') === 'true') {
      toast.info('Checkout was canceled')
      return
    }

    if (searchParams.get('success') === 'true') {
      toast.success('Subscription started successfully!')

      // If status is still inactive, poll for the update
      if (initialStatus === 'inactive') {
        setIsPolling(true)
        let pollCount = 0
        const maxPolls = 10 // Poll for up to 10 seconds

        const pollInterval = setInterval(async () => {
          pollCount++
          const data = await pollSubscriptionStatus()

          if (data && data.status !== 'inactive') {
            // Subscription updated! Update local state
            setSubscriptionData({
              status: data.status,
              trialEnd: data.trialEnd,
              currentPeriodEnd: data.currentPeriodEnd,
              cancelAtPeriodEnd: data.cancelAtPeriodEnd,
              priceCents: data.priceCents,
            })
            setIsPolling(false)
            clearInterval(pollInterval)

            // Also trigger a router refresh to update server state
            router.refresh()

            // Clear the success param from URL
            const url = new URL(window.location.href)
            url.searchParams.delete('success')
            window.history.replaceState({}, '', url.toString())
          } else if (pollCount >= maxPolls) {
            // Stop polling after max attempts
            setIsPolling(false)
            clearInterval(pollInterval)
            toast.info('Subscription is being processed. Please refresh the page in a moment.')
          }
        }, 1000)

        return () => clearInterval(pollInterval)
      }
    }
  }, [searchParams, initialStatus, pollSubscriptionStatus, router])

  // Check if Stripe is configured by attempting a request
  useEffect(() => {
    // Simple check - if the API returns 503, Stripe is not configured
    fetch('/api/billing/create-checkout', { method: 'POST' })
      .then(res => {
        if (res.status === 503) {
          setStripeConfigured(false)
        }
      })
      .catch(() => {
        // Ignore errors - we'll show the not configured state
      })
  }, [])

  const handleStartTrial = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start checkout')
      }

      const { url } = await response.json()

      if (url) {
        window.location.href = url
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout')
      setIsLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to open billing portal')
      }

      const { url } = await response.json()

      if (url) {
        window.location.href = url
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to open billing portal')
      setIsLoading(false)
    }
  }

  // Show "Billing coming soon" if Stripe is not configured
  if (!stripeConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Billing Coming Soon
          </CardTitle>
          <CardDescription>
            Subscription billing is not yet configured for this instance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You can continue using TimeLi with full access to all features.
            Billing will be enabled in a future update.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Current Plan
              </CardTitle>
              <CardDescription>
                Your subscription status and billing information
              </CardDescription>
            </div>
            {getStatusBadge(status, cancelAtPeriodEnd)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Inactive - Show Start Trial or Polling State */}
          {status === 'inactive' && (
            <div className="space-y-4">
              {isPolling ? (
                // Show loading state while polling for subscription update
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div className="text-center">
                    <h3 className="font-medium">Activating your subscription...</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Please wait while we confirm your payment.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="font-medium">Start Your Free Trial</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Get 30 days free, then {formatPrice(priceCents)}/month.
                      Cancel anytime.
                    </p>
                  </div>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Unlimited schedule generations
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      AI-powered schedule optimization
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Chat-based schedule refinement
                    </li>
                  </ul>
                  <Button
                    onClick={handleStartTrial}
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Redirecting...
                      </>
                    ) : (
                      'Start Free Trial'
                    )}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Trialing - Show Trial Info */}
          {status === 'trialing' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Trial Ends
                  </div>
                  <div className="text-lg font-semibold">
                    {formatDate(trialEnd)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Price After Trial
                  </div>
                  <div className="text-lg font-semibold">
                    {formatPrice(priceCents)}/month
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Your payment method will be charged after the trial ends.
                Manage your subscription to update payment details or cancel.
              </p>
              <Button
                variant="outline"
                onClick={handleManageSubscription}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Opening...
                  </>
                ) : (
                  'Manage Subscription'
                )}
              </Button>
            </div>
          )}

          {/* Active - Show Billing Info */}
          {status === 'active' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {cancelAtPeriodEnd ? 'Access Until' : 'Next Billing Date'}
                  </div>
                  <div className="text-lg font-semibold">
                    {formatDate(currentPeriodEnd)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Monthly Price
                  </div>
                  <div className="text-lg font-semibold">
                    {formatPrice(priceCents)}
                  </div>
                </div>
              </div>
              {cancelAtPeriodEnd && (
                <p className="text-sm text-amber-600">
                  Your subscription will cancel at the end of the current period.
                  You can reactivate from the billing portal.
                </p>
              )}
              <Button
                variant="outline"
                onClick={handleManageSubscription}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Opening...
                  </>
                ) : (
                  'Manage Subscription'
                )}
              </Button>
            </div>
          )}

          {/* Canceled - Show Resubscribe */}
          {status === 'canceled' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Subscription Canceled</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your subscription has been canceled. Resubscribe to regain access
                  to all premium features.
                </p>
              </div>
              <Button
                onClick={handleStartTrial}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  'Resubscribe'
                )}
              </Button>
            </div>
          )}

          {/* Past Due - Show Warning */}
          {status === 'past_due' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-destructive">Payment Failed</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your last payment failed. Please update your payment method
                  to continue your subscription.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleManageSubscription}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Opening...
                  </>
                ) : (
                  'Update Payment Method'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
