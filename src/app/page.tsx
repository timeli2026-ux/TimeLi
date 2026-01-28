'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Calendar,
  Brain,
  Sparkles,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Lock,
  Clock,
  Target,
  Loader2,
} from 'lucide-react'

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (res.status === 201) {
        setStatus('success')
        setEmail('')
      } else if (res.status === 409) {
        setStatus('error')
        setErrorMessage("You're already on the list!")
      } else {
        const data = await res.json()
        setStatus('error')
        setErrorMessage(data.error || 'Something went wrong')
      }
    } catch {
      setStatus('error')
      setErrorMessage('Unable to connect. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-950" />

        <div className="relative mx-auto max-w-5xl px-6 py-24 sm:py-32 lg:py-40">
          {/* Nav */}
          <div className="absolute top-6 right-6 flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
              Log in
            </Link>
            <Button asChild size="sm">
              <Link href="/signup">Sign up</Link>
            </Button>
          </div>

          <div className="text-center">
            {/* Logo/Brand */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <Calendar className="h-4 w-4" />
              <span>TimeLi</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl lg:text-6xl">
              Your week, optimized.
            </h1>

            {/* Subheadline */}
            <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400 sm:text-xl">
              AI-powered weekly scheduling that respects your life constraints, explains its reasoning, and learns your patterns over time.
            </p>

            {/* Waitlist Form */}
            <div className="mx-auto mt-10 max-w-md">
              {status === 'success' ? (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">You&apos;re on the list!</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex gap-3">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 flex-1"
                    disabled={status === 'loading'}
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className="h-11 px-6"
                    disabled={status === 'loading'}
                  >
                    {status === 'loading' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Join waitlist
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}
              {status === 'error' && errorMessage && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {errorMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-zinc-200 bg-white py-20 dark:border-zinc-800 dark:bg-zinc-900 sm:py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 sm:text-3xl">
              Scheduling that actually works
            </h2>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              Not another calendar app. A system that understands your life.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {/* Feature 1 */}
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <Lock className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
              </div>
              <h3 className="mt-4 font-medium text-zinc-900 dark:text-zinc-50">
                Understands your constraints
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Sleep schedules, fixed meetings, meal times, commutes - your locked events stay locked.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <Brain className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
              </div>
              <h3 className="mt-4 font-medium text-zinc-900 dark:text-zinc-50">
                Explains its reasoning
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Every scheduled block comes with a rationale. No black box - you know why it was placed there.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <Sparkles className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
              </div>
              <h3 className="mt-4 font-medium text-zinc-900 dark:text-zinc-50">
                Learns your patterns
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Preferences confirmed over time become part of your profile. It gets better the more you use it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="border-t border-zinc-200 py-20 dark:border-zinc-800 sm:py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 sm:text-3xl">
              How it works
            </h2>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              From goals to schedule in three steps
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {/* Step 1 */}
            <div className="relative">
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
                  1
                </div>
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                    Tell us about your life
                  </h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    Quick onboarding captures your constraints, commitments, and goals through natural conversation.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-500">
                    <Clock className="h-4 w-4" />
                    <span>5 minute setup</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
                  2
                </div>
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                    We build your schedule
                  </h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    Our algorithm places your goals around your constraints, optimizing for energy levels and preferences.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-500">
                    <Target className="h-4 w-4" />
                    <span>Deterministic, explainable</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
                  3
                </div>
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                    Refine with AI chat
                  </h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    Ask questions, request changes, or just drag and drop. Your schedule adapts to your feedback.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-500">
                    <MessageSquare className="h-4 w-4" />
                    <span>Natural conversation</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 py-8 dark:border-zinc-800">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex items-center justify-center text-sm text-zinc-500 dark:text-zinc-500">
            <span>&copy; {new Date().getFullYear()} TimeLi. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
