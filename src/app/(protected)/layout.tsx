import { UserMenu } from '@/components/user-menu'
import Link from 'next/link'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-semibold">
              TimeLi
            </Link>
            <nav className="hidden sm:flex items-center gap-4 text-sm">
              <Link
                href="/calendar"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Calendar
              </Link>
              <Link
                href="/goals"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Goals
              </Link>
              <Link
                href="/review"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Review
              </Link>
              <Link
                href="/settings"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Settings
              </Link>
            </nav>
          </div>
          <UserMenu />
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
