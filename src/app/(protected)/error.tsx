'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function ProtectedError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground">
          We encountered an error while loading this page. Please try again.
        </p>
        <div className="flex justify-center gap-2">
          <Button onClick={reset} variant="outline">
            Try again
          </Button>
          <Link href="/dashboard">
            <Button variant="ghost">Go to dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
