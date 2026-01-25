import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StudentOnboardingWizard } from '@/components/onboarding/student/wizard'

export default async function StudentOnboardingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if onboarding already completed
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  if (profile?.onboarding_completed) {
    redirect('/dashboard')
  }

  return <StudentOnboardingWizard />
}
