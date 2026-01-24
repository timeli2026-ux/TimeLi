import { redirect } from 'next/navigation'

// Settings index page - redirect to default tab (preferences)
export default function SettingsPage() {
  redirect('/settings/preferences')
}
