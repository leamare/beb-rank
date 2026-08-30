import { useMemo, useState } from 'react'
import { useApp } from '../../state/AppContext'
import { CategoryTrendChart } from '../charts/CategoryTrendChart'
import { CalendarHeatmap } from '../charts/CalendarHeatmap'
import { SignificantShifts } from '../charts/SignificantShifts'
import { dailySeries, lastNDates } from '../../domain/dailyTotals'

const RANGES = [7, 30, 90]

export function DynamicsTab() {
  const { categories, logs } = useApp()
  const [days, setDays] = useState(30)

  const averages = useMemo(() => {
    const dates = lastNDates(days)
    const series = dailySeries(logs, categories, dates)
    return Object.fromEntries(
      categories.map((c) => [
        c.key,
        Math.round(series.reduce((sum, s) => sum + s.totals[c.key], 0) / series.length),
      ]),
    )
  }, [logs, categories, days])

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setDays(r)}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              days === r ? 'bg-accent text-white' : 'border border-border text-ink-soft hover:bg-surface'
            }`}
          >
            {r}d
          </button>
        ))}
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Average end-of-day standing</h2>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((c) => (
            <div key={c.key} className="rounded-xl border border-border bg-surface p-3 text-center">
              <div className="text-lg">{c.emoji}</div>
              <div className="text-lg font-semibold" style={{ color: c.color }}>
                {averages[c.key]}
              </div>
              <div className="text-[10px] text-muted">{c.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Trend</h2>
        <CategoryTrendChart logs={logs} categories={categories} days={days} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Calendar</h2>
        <CalendarHeatmap logs={logs} categories={categories} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Most significant shifts</h2>
        <SignificantShifts logs={logs} categories={categories} />
      </section>
    </div>
  )
}
