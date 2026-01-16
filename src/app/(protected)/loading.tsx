export default function ProtectedLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="h-4 w-48 bg-muted rounded" />
      </div>
    </div>
  )
}
