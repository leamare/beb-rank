import { useMemo, useState } from 'react'
import { useApp } from '../../state/AppContext'
import { RecentLogsList } from '../RecentLogsList'
import { todayKey } from '../../domain/log'
import { totalsForDate } from '../../domain/dailyTotals'

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + days)
  return todayKey(d)
}

export function LogTab() {
  const { categories, logs, removeLog } = useApp()
  const [date, setDate] = useState(todayKey())

  const dayLogs = useMemo(() => logs.filter((l) => l.date === date), [logs, date])
  const totals = useMemo(() => totalsForDate(logs, categories, date), [logs, categories, date])
  const isToday = date === todayKey()

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setDate(shiftDate(date, -1))} className="px-2 py-1 text-lg">
          ‹
        </button>
        <input
          type="date"
          value={date}
          max={todayKey()}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-border bg-transparent px-2 py-1 text-sm text-ink"
        />
        <button
          onClick={() => setDate(shiftDate(date, 1))}
          disabled={isToday}
          className="px-2 py-1 text-lg disabled:opacity-30"
        >
          ›
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <span
            key={c.key}
            className="flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs"
          >
            {c.emoji} <span style={{ color: c.color }}>{totals[c.key]}</span>
          </span>
        ))}
      </div>

      <RecentLogsList logs={dayLogs} categories={categories} limit={dayLogs.length} onDelete={(id) => void removeLog(id)} />
    </div>
  )
}
