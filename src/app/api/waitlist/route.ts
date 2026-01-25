import { createClient } from '@supabase/supabase-js'
import { waitlistSchema } from '@/lib/validations/waitlist'
import { NextResponse } from 'next/server'

// =============================================================================
// POST /api/waitlist - Join the waitlist
// =============================================================================
// Uses anon key - no authentication required for waitlist signup.

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validationResult = waitlistSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    const { email } = validationResult.data

    // Create Supabase client with anon key (waitlist is public)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Insert email into waitlist
    const { error: insertError } = await supabase
      .from('waitlist')
      .insert({ email: email.toLowerCase().trim() })

    if (insertError) {
      // Handle duplicate email
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Email already on waitlist' },
          { status: 409 }
        )
      }

      console.error('Waitlist insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to join waitlist' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Successfully joined waitlist' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Waitlist POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
