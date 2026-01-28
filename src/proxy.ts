import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { rateLimit, rateLimitPresets } from '@/lib/rate-limit'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rate limit auth endpoints before processing
  const authPaths = ['/login', '/signup', '/forgot-password']
  if (authPaths.includes(pathname)) {
    // Use IP address as identifier (or forwarded IP in production)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown'

    const identifier = `auth:${ip}`
    const result = rateLimit(identifier, rateLimitPresets.auth)

    if (!result.success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter: Math.ceil((result.reset - Date.now()) / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': String(result.reset)
          }
        }
      )
    }
  }

  // Password reset specific rate limiting (stricter)
  if (pathname === '/forgot-password' || pathname === '/reset-password') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown'

    const identifier = `password-reset:${ip}`
    const result = rateLimit(identifier, rateLimitPresets.passwordReset)

    if (!result.success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many password reset attempts',
          retryAfter: Math.ceil((result.reset - Date.now()) / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': String(result.reset)
          }
        }
      )
    }
  }

  // If Supabase env vars are missing, pass through without auth checks
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session - important for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - require authentication
  const isOnboardingPath = pathname.startsWith('/onboarding')
  const isProtectedPath = pathname.startsWith('/dashboard') ||
                          pathname.startsWith('/calendar') ||
                          pathname.startsWith('/assignments') ||
                          pathname.startsWith('/goals') ||
                          pathname.startsWith('/review') ||
                          pathname.startsWith('/settings')

  if (isProtectedPath || isOnboardingPath) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Check onboarding status for authenticated users on protected routes
    // Note: This requires an additional Supabase query. Can optimize later with session claims if needed.
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()

    const onboardingCompleted = profile?.onboarding_completed ?? false

    // Redirect non-onboarded users to onboarding (unless already on onboarding page)
    if (!onboardingCompleted && isProtectedPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }

    // Redirect onboarded users away from onboarding to dashboard
    if (onboardingCompleted && isOnboardingPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Auth routes - redirect to dashboard if already logged in
  // Exception: reset-password should be accessible with valid recovery session
  if (pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password') {
    if (user) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Reset password page - allow access (user has recovery session from email link)
  // The page component handles session validation

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
