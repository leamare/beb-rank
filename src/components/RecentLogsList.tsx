import type { Category } from '../domain/categories'
import type { LogEntry } from '../domain/log'

interface Props {
  logs: LogEntry[]
  categories: Category[]
  limit?: number
  onDelete?: (id: string) => void
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60_000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function RecentLogsList({ logs, categories, limit = 8, onDelete }: Props) {
  const byId = Object.fromEntries(categories.map((c) => [c.key, c]))
  const recent = [...logs]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit)

  if (recent.length === 0) {
    return <p className="text-sm text-muted">No logs yet.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {recent.map((log) => {
        const cat = byId[log.category]
        return (
          <li
            key={log.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
          >
            <div className="flex items-start gap-2">
              <span className="text-lg leading-none">{cat?.emoji ?? '•'}</span>
              <div>
                <div className="text-ink">
                  {cat?.label ?? log.category}{' '}
                  <span className={log.delta > 0 ? 'text-positive' : 'text-negative'}>
                    {log.delta > 0 ? '+' : ''}
                    {log.delta}
                  </span>
                </div>
                {log.reason && <div className="text-xs text-muted">{log.reason}</div>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="whitespace-nowrap text-xs text-muted">{timeAgo(log.timestamp)}</span>
              {onDelete && (
                <button onClick={() => onDelete(log.id)} className="text-xs text-muted underline">
                  undo
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
