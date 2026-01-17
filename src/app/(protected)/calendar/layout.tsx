import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Calendar | TimeLi',
  description: 'View and manage your weekly schedule',
}

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="h-[calc(100vh-3.5rem-3rem)]">{children}</div>
}
