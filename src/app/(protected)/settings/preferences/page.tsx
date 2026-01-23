'use client'

import Link from 'next/link'
import { Settings, Target, User, ArrowLeft, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PreferencesPanel } from '@/components/preferences/preferences-panel'

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function PreferencesPage() {
  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container py-6">
          {/* Back link */}
          <Link
            href="/calendar"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Calendar
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Settings className="h-6 w-6" />
                Schedule Preferences
              </h1>
              <p className="text-muted-foreground mt-1">
                Customize how your week is scheduled
              </p>
            </div>
          </div>

          {/* Settings Navigation Tabs */}
          <div className="flex gap-1 mt-6 -mb-px">
            <Link href="/settings/preferences">
              <Button
                variant="ghost"
                className="rounded-b-none border-b-2 border-primary text-foreground"
              >
                <Settings className="h-4 w-4 mr-2" />
                Preferences
              </Button>
            </Link>
            <Link href="/goals">
              <Button
                variant="ghost"
                className="rounded-b-none border-b-2 border-transparent text-muted-foreground hover:text-foreground"
              >
                <Target className="h-4 w-4 mr-2" />
                Goals
              </Button>
            </Link>
            <Button
              variant="ghost"
              className="rounded-b-none border-b-2 border-transparent text-muted-foreground"
              disabled
            >
              <User className="h-4 w-4 mr-2" />
              Account
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 container py-6">
        <div className="max-w-2xl mx-auto">
          {/* Info Banner */}
          <div className="flex items-start gap-3 p-4 mb-6 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">About Preferences</p>
              <p className="mt-1">
                Changes to preferences will affect future schedule generations.
                Your current weekly schedule will not be modified.
              </p>
            </div>
          </div>

          {/* Preferences Form Panel */}
          <PreferencesPanel />
        </div>
      </div>
    </div>
  )
}
