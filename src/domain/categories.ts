export type CategoryKey =
  | 'mental'
  | 'capable'
  | 'tidy'
  | 'listening'
  | 'aware'
  | 'compliant'

export interface Category {
  key: CategoryKey
  label: string
  emoji: string
  basePoints: number
  color: string
}

export const DEFAULT_CATEGORIES: Category[] = [
  { key: 'mental', label: 'Mental', emoji: '🧠', basePoints: 50, color: '#2a78d6' },
  { key: 'capable', label: 'Capable', emoji: '🧩', basePoints: 50, color: '#eb6834' },
  { key: 'tidy', label: 'Tidy', emoji: '🧹', basePoints: 50, color: '#1baf7a' },
  { key: 'listening', label: 'Listening', emoji: '👂', basePoints: 50, color: '#eda100' },
  { key: 'aware', label: 'Aware', emoji: '👀', basePoints: 50, color: '#e87ba4' },
  { key: 'compliant', label: 'Compliant', emoji: '✅', basePoints: 50, color: '#008300' },
]

export const CATEGORY_KEYS = DEFAULT_CATEGORIES.map((c) => c.key)
