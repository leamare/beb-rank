import { useMemo, useState } from 'react'
import type { Category, CategoryKey } from '../../domain/categories'
import type { LogEntry } from '../../domain/log'
import { todayKey } from '../../domain/log'
import { divergingColor } from '../../domain/colorScale'

interface Props {
  logs: LogEntry[]
  categories: Category[]
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function CalendarHeatmap({ logs, categories }: Props) {
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [filter, setFilter] = useState<CategoryKey | 'all'>('all')

  const byDate = useMemo(() => {
    const map: Record<string, number> = {}
    for (const log of logs) {
      if (filter !== 'all' && log.category !== filter) continue
      map[log.date] = (map[log.date] ?? 0) + log.delta
    }
    return map
  }, [logs, filter])

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const cells: { date: string | null; value: number }[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push({ date: null, value: 0 })
  for (let d = 1; d <= daysInMonth; d++) {
    const date = todayKey(new Date(month.getFullYear(), month.getMonth(), d))
    cells.push({ date, value: byDate[date] ?? 0 })
  }

  const scaleMax = Math.max(1, ...cells.map((c) => Math.abs(c.value)))
  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const today = todayKey()

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="px-2 text-lg">
          ‹
        </button>
        <span className="text-sm font-medium text-[#0b0b0b] dark:text-white">{monthLabel}</span>
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="px-2 text-lg">
          ›
        </button>
      </div>

      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value as CategoryKey | 'all')}
        className="mb-3 rounded-lg border border-[#c3c2b7] bg-transparent px-2 py-1 text-xs text-[#0b0b0b] dark:text-white"
      >
        <option value="all">All categories</option>
        {categories.map((c) => (
          <option key={c.key} value={c.key}>
            {c.emoji} {c.label}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[#898781]">
        {WEEKDAYS.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
        {cells.map((cell, i) =>
          cell.date === null ? (
            <div key={i} />
          ) : (
            <div
              key={i}
              title={`${cell.date}: ${cell.value > 0 ? '+' : ''}${cell.value}`}
              className={`aspect-square rounded-md ${cell.date === today ? 'ring-1 ring-[#2a78d6]' : ''}`}
              style={{ background: divergingColor(cell.value, scaleMax) }}
            />
          ),
        )}
      </div>
    </div>
  )
}
