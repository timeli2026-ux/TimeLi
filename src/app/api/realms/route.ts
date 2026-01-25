import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// =============================================================================
// GET /api/realms - List all realms for authenticated user
// =============================================================================

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Query life_realms for the user
    // Using (supabase as any) until types are regenerated
    const { data: realms, error: realmsError } = await (supabase as any)
      .from('life_realms')
      .select('id, name, icon')
      .eq('user_id', user.id)
      .order('name', { ascending: true })

    if (realmsError) {
      console.error('Error fetching realms:', realmsError)
      return NextResponse.json(
        { error: 'Failed to fetch realms' },
        { status: 500 }
      )
    }

    return NextResponse.json({ realms: realms || [] })
  } catch (error) {
    console.error('Realms GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
