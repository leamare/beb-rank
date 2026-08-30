export type CategoryKey =
  | 'mental'
  | 'capable'
  | 'tidy'
  | 'listening'
  | 'aware'
  | 'cooperative'

export interface Category {
  key: CategoryKey
  label: string
  emoji: string
  basePoints: number
  color: string
  description: string
}

export const DEFAULT_BASE_POINTS = 12

export const DEFAULT_CATEGORIES: Category[] = [
  {
    key: 'mental',
    label: 'Mental',
    emoji: '🧠',
    basePoints: DEFAULT_BASE_POINTS,
    color: '#3987e5',
    description:
      'Staying mentally present and stable — handling overwhelm, keeping emotional outbursts in check, staying focused instead of brainrotting.',
  },
  {
    key: 'capable',
    label: 'Capable',
    emoji: '🧩',
    basePoints: DEFAULT_BASE_POINTS,
    color: '#d97757',
    description: 'Handling basic day-to-day tasks on your own, without needing help.',
  },
  {
    key: 'tidy',
    label: 'Tidy',
    emoji: '🧹',
    basePoints: DEFAULT_BASE_POINTS,
    color: '#4fb894',
    description: 'Hygiene, tidiness, and cleaning up after yourself — kitchen, workspace, self-care.',
  },
  {
    key: 'listening',
    label: 'Listening',
    emoji: '👂',
    basePoints: DEFAULT_BASE_POINTS,
    color: '#c9a15f',
    description: 'Holding a real conversation — listening, not just talking about yourself.',
  },
  {
    key: 'aware',
    label: 'Aware',
    emoji: '👀',
    basePoints: DEFAULT_BASE_POINTS,
    color: '#d581b0',
    description: 'Noticing what’s happening around you and what people need, unprompted.',
  },
  {
    key: 'cooperative',
    label: 'Cooperative',
    emoji: '🤝',
    basePoints: DEFAULT_BASE_POINTS,
    color: '#8fa9f2',
    description: 'Following through on what’s asked, instead of pushing back.',
  },
]

export const CATEGORY_KEYS = DEFAULT_CATEGORIES.map((c) => c.key)
