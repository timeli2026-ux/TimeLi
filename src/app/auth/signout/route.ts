import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function POST() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    // Redirect to login even on error - user likely has invalid session
    console.error('Signout error:', error.message)
  }

  redirect('/login')
}
