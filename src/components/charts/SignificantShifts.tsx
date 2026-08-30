import type { Category } from '../../domain/categories'
import type { LogEntry } from '../../domain/log'

interface Props {
  logs: LogEntry[]
  categories: Category[]
  limit?: number
}

export function SignificantShifts({ logs, categories, limit = 10 }: Props) {
  const byId = Object.fromEntries(categories.map((c) => [c.key, c]))
  const shifts = [...logs]
    .filter((l) => l.reason)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit)

  if (shifts.length === 0) {
    return <p className="text-sm text-[#898781]">No significant shifts logged yet.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {shifts.map((log) => {
        const cat = byId[log.category]
        return (
          <li
            key={log.id}
            className="flex items-start gap-2 rounded-lg border border-[#e1e0d9] px-3 py-2 text-sm dark:border-[#2c2c2a]"
          >
            <span className="text-lg leading-none">{cat?.emoji ?? '•'}</span>
            <div>
              <div className="text-[#0b0b0b] dark:text-white">
                {cat?.label ?? log.category}{' '}
                <span className={log.delta > 0 ? 'text-[#006300]' : 'text-[#e34948]'}>
                  {log.delta > 0 ? '+' : ''}
                  {log.delta}
                </span>{' '}
                <span className="text-xs text-[#898781]">{log.date}</span>
              </div>
              <div className="text-xs text-[#898781]">{log.reason}</div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
