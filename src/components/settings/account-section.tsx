'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, KeyRound, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'

// =============================================================================
// TYPES
// =============================================================================

interface AccountSectionProps {
  email: string
  timezone: string
}

// =============================================================================
// ACCOUNT SECTION COMPONENT
// =============================================================================

export function AccountSection({ email, timezone }: AccountSectionProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    setDeleteError(null)

    try {
      const response = await fetch('/api/account', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete account')
      }

      // Sign out and redirect to home
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'An error occurred')
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account details and settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1">
            <div className="text-sm font-medium text-muted-foreground">Email</div>
            <div className="text-sm">{email}</div>
          </div>
          <div className="grid gap-1">
            <div className="text-sm font-medium text-muted-foreground">Timezone</div>
            <div className="text-sm">{timezone}</div>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Update your password</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/forgot-password">
            <Button variant="outline">
              <KeyRound className="h-4 w-4 mr-2" />
              Change Password
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                Delete Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Delete Account
                </DialogTitle>
                <DialogDescription className="text-left space-y-3 pt-2">
                  <p>
                    This action is <strong>permanent and cannot be undone</strong>.
                    All your data will be deleted, including:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Your profile and preferences</li>
                    <li>All goals and schedules</li>
                    <li>Subscription and billing history</li>
                  </ul>
                  <p className="text-sm text-destructive font-medium">
                    Are you sure you want to delete your account?
                  </p>
                </DialogDescription>
              </DialogHeader>
              {deleteError && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {deleteError}
                </div>
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Yes, Delete My Account'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}
