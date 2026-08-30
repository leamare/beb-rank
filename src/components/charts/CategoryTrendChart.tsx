import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { Category } from '../../domain/categories'
import type { LogEntry } from '../../domain/log'
import { dailySeries, lastNDates } from '../../domain/dailyTotals'

interface Props {
  logs: LogEntry[]
  categories: Category[]
  days: number
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
        <CartesianGrid stroke="#e1e0d9" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" stroke="#898781" fontSize={11} tickLine={false} />
        <YAxis stroke="#898781" fontSize={11} tickLine={false} width={32} />
        <Tooltip
          contentStyle={{ background: '#fcfcfb', border: '1px solid #e1e0d9', fontSize: 12 }}
          labelStyle={{ color: '#0b0b0b' }}
        />
        <Legend
          formatter={(value: string) => {
            const c = categories.find((cat) => cat.key === value)
            return c ? `${c.emoji} ${c.label}` : value
          }}
          wrapperStyle={{ fontSize: 11 }}
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
