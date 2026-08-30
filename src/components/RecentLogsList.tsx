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
    return <p className="text-sm text-[#898781]">No logs yet.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {recent.map((log) => {
        const cat = byId[log.category]
        return (
          <li
            key={log.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-[#e1e0d9] px-3 py-2 text-sm dark:border-[#2c2c2a]"
          >
            <div className="flex items-start gap-2">
              <span className="text-lg leading-none">{cat?.emoji ?? '•'}</span>
              <div>
                <div className="text-[#0b0b0b] dark:text-white">
                  {cat?.label ?? log.category}{' '}
                  <span className={log.delta > 0 ? 'text-[#006300]' : 'text-[#e34948]'}>
                    {log.delta > 0 ? '+' : ''}
                    {log.delta}
                  </span>
                </div>
                {log.reason && <div className="text-xs text-[#898781]">{log.reason}</div>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="whitespace-nowrap text-xs text-[#898781]">{timeAgo(log.timestamp)}</span>
              {onDelete && (
                <button onClick={() => onDelete(log.id)} className="text-xs text-[#898781] underline">
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
