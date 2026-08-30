import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { Category } from '../../domain/categories'
import type { LogEntry } from '../../domain/log'
import { dailySeries, lastNDates } from '../../domain/dailyTotals'

interface Props {
  logs: LogEntry[]
  categories: Category[]
  days: number
}

interface ChartTooltipProps {
  active?: boolean
  payload?: readonly { dataKey?: unknown; value?: unknown; color?: string }[]
  label?: string
  categories: Category[]
}

function ChartTooltip({ active, payload, label, categories }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-surface p-2 text-xs shadow-lg">
      <div className="mb-1 font-medium text-ink">{label}</div>
      <div className="flex flex-col gap-0.5">
        {payload.map((p) => {
          const c = categories.find((cat) => cat.key === p.dataKey)
          return (
            <div key={String(p.dataKey)} className="flex items-center gap-1.5">
              <span>{c?.emoji}</span>
              <span style={{ color: p.color as string }}>{String(p.value)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function CategoryTrendChart({ logs, categories, days }: Props) {
  const dates = lastNDates(days)
  const series = dailySeries(logs, categories, dates)
  const data = series.map((s) => ({
    date: s.date.slice(5),
    ...Object.fromEntries(categories.map((c) => [c.key, s.totals[c.key]])),
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="#2c3557" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" stroke="#7e88ac" fontSize={11} tickLine={false} />
        <YAxis stroke="#7e88ac" fontSize={11} tickLine={false} width={32} />
        <Tooltip
          content={(props) => (
            <ChartTooltip {...(props as unknown as ChartTooltipProps)} categories={categories} />
          )}
        />
        <Legend
          formatter={(value: string) => {
            const c = categories.find((cat) => cat.key === value)
            return c ? `${c.emoji} ${c.label}` : value
          }}
          wrapperStyle={{ fontSize: 11, color: '#b9c2de' }}
        />
        {categories.map((c) => (
          <Line
            key={c.key}
            type="monotone"
            dataKey={c.key}
            stroke={c.color}
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
