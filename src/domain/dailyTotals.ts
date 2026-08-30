import type { Category, CategoryKey } from './categories'
import type { LogEntry } from './log'
import { todayKey } from './log'

export function totalsForDate(
  logs: LogEntry[],
  categories: Category[],
  date: string,
): Record<CategoryKey, number> {
  const totals = {} as Record<CategoryKey, number>
  for (const c of categories) totals[c.key] = c.basePoints

  for (const log of logs) {
    if (log.date !== date) continue
    if (totals[log.category] === undefined) continue
    totals[log.category] += log.delta
  }
  return totals
}

export function todaysTotals(logs: LogEntry[], categories: Category[]): Record<CategoryKey, number> {
  return totalsForDate(logs, categories, todayKey())
}

export function dailySeries(
  logs: LogEntry[],
  categories: Category[],
  dates: string[],
): { date: string; totals: Record<CategoryKey, number> }[] {
  return dates.map((date) => ({ date, totals: totalsForDate(logs, categories, date) }))
}

export function netDeltaByDate(logs: LogEntry[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const log of logs) {
    result[log.date] = (result[log.date] ?? 0) + log.delta
  }
  return result
}

export function lastNDates(n: number, end: Date = new Date()): string[] {
  const dates: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    dates.push(todayKey(d))
  }
  return dates
}
