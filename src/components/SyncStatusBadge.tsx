import { useApp } from '../state/AppContext'

const LABEL: Record<string, string> = {
  idle: 'Synced',
  syncing: 'Syncing…',
  offline: 'Offline',
  error: 'Sync error',
}

const DOT: Record<string, string> = {
  idle: 'bg-status-good',
  syncing: 'bg-status-sync',
  offline: 'bg-muted',
  error: 'bg-status-bad',
}

export function SyncStatusBadge() {
  const { authStatus, syncStatus, pendingCount } = useApp()

  if (authStatus === 'guest') {
    return <span className="text-xs text-muted">Local only</span>
  }

  const label = LABEL[syncStatus] ?? syncStatus
  const dot = DOT[syncStatus] ?? 'bg-muted'

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
      {pendingCount > 0 && ` (${pendingCount})`}
    </span>
  )
}
