import type { CategoryKey } from './categories'
import type { MagnitudeType } from './points'

export interface LogEntry {
  id: string
  timestamp: string
  date: string
  category: CategoryKey
  type: MagnitudeType
  delta: number
  reason: string
}

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
