import { useApp } from '../state/AppContext'

const LABEL: Record<string, string> = {
  idle: 'Synced',
  syncing: 'Syncing…',
  offline: 'Offline',
  error: 'Sync error',
}

export function SyncStatusBadge() {
  const { authStatus, syncStatus, pendingCount } = useApp()

  if (authStatus === 'guest') {
    return <span className="text-xs text-[#898781]">Local only</span>
  }

  const label = LABEL[syncStatus] ?? syncStatus
  const dot =
    syncStatus === 'idle' ? 'bg-[#0ca30c]' : syncStatus === 'syncing' ? 'bg-[#eda100]' : 'bg-[#e34948]'

  return (
    <span className="flex items-center gap-1.5 text-xs text-[#898781]">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
      {pendingCount > 0 && ` (${pendingCount})`}
    </span>
  )
}
