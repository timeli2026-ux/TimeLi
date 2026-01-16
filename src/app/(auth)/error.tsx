'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function AuthError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Something went wrong</CardTitle>
        <CardDescription>
          We couldn&apos;t complete that action. Please try again.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          If the problem persists, please contact support.
        </p>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button onClick={reset} variant="outline">
          Try again
        </Button>
        <Link href="/login">
          <Button variant="ghost">Back to login</Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
