import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from '@/components/onboarding/wizard'

export default async function OnboardingPage() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect if not authenticated (backup to middleware)
  if (!user) {
    redirect('/login')
  }

  // Check if onboarding is already completed
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  // If onboarding is completed, redirect to dashboard
  if (profile && profile.onboarding_completed) {
    redirect('/dashboard')
  }

  return <OnboardingWizard />
}
