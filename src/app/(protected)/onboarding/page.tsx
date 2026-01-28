import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StudentOnboardingWizard } from '@/components/onboarding/student/wizard'

export default async function OnboardingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  if (profile?.onboarding_completed) {
    redirect('/dashboard')
  }

  // Clean up ALL existing data so re-onboarding starts completely fresh
  // Order matters due to foreign key constraints
  await (supabase as any).from('schedule_completions').delete().eq('user_id', user.id)
  await (supabase as any).from('schedule_feedback').delete().eq('user_id', user.id)
  await (supabase as any).from('generated_schedules').delete().eq('user_id', user.id)
  await (supabase as any).from('user_goals').delete().eq('user_id', user.id)
  await (supabase as any).from('life_realms').delete().eq('user_id', user.id)
  await (supabase as any).from('fixed_commitments').delete().eq('user_id', user.id)
  await (supabase as any).from('assignments').delete().eq('user_id', user.id)
  await (supabase as any).from('courses').delete().eq('user_id', user.id)
  // Clear old v1 initial_actions to prevent auto-migration of stale data
  await (supabase as any)
    .from('user_preferences')
    .update({ initial_actions: null, life_realms: null })
    .eq('user_id', user.id)

  return <StudentOnboardingWizard />
}
