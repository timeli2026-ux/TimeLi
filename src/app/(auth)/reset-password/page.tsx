'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { validatePassword } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validSession, setValidSession] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if user has a valid recovery session
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      // User should have a session from clicking the reset link
      setValidSession(!!session)
    }

    checkSession()
  }, [])

  const validateForm = (): string | null => {
    const passwordError = validatePassword(password)
    if (passwordError) return passwordError

    if (password !== confirmPassword) {
      return 'Passwords do not match'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        setError(updateError.message)
        return
      }

      setSuccess(true)

      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 2000)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Loading state while checking session
  if (validSession === null) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <div className="animate-pulse text-muted-foreground">
              Loading...
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // No valid session - show error
  if (!validSession) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invalid or expired link</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired. Please request a
            new one.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/forgot-password">
            <Button variant="outline">Request new link</Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Password updated</CardTitle>
          <CardDescription>
            Your password has been successfully updated. Redirecting to
            dashboard...
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set new password</CardTitle>
        <CardDescription>
          Enter your new password below.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              New Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Updating...' : 'Update password'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
