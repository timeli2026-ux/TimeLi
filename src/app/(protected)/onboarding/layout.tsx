// Onboarding layout - minimal focused experience
// No sidebar or navigation to keep user focused on completing setup

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-14 items-center justify-center px-4">
          <span className="text-lg font-semibold">TimeLi</span>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
