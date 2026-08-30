import type { Category, CategoryKey } from '../../domain/categories'
import { MAGNITUDE_ORDER, MAGNITUDE_VALUES, type MagnitudeType } from '../../domain/points'

interface Props {
  categories: Category[]
  totals: Record<CategoryKey, number>
  onRequestLog: (category: Category, type: MagnitudeType, sign: 1 | -1) => void
}

function MagnitudeButton({
  value,
  sign,
  onClick,
}: {
  value: number
  sign: 1 | -1
  onClick: () => void
}) {
  const positive = sign === 1
  return (
    <button
      onClick={onClick}
      className={`rounded-lg py-2 text-sm font-medium active:opacity-70 ${
        positive
          ? 'bg-[#0ca30c]/10 text-[#006300] dark:text-[#0ca30c]'
          : 'bg-[#e34948]/10 text-[#e34948]'
      }`}
    >
      {positive ? '+' : '-'}
      {value}
    </button>
  )
}

export function CategoryLogGrid({ categories, totals, onRequestLog }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {categories.map((c) => (
        <div key={c.key} className="rounded-xl border border-[#e1e0d9] p-3 dark:border-[#2c2c2a]">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium text-[#0b0b0b] dark:text-white">
              <span className="text-lg">{c.emoji}</span>
              {c.label}
            </span>
            <span className="text-lg font-semibold" style={{ color: c.color }}>
              {totals[c.key]}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {MAGNITUDE_ORDER.map((type) => (
              <MagnitudeButton
                key={`neg-${type}`}
                value={MAGNITUDE_VALUES[type]}
                sign={-1}
                onClick={() => onRequestLog(c, type, -1)}
              />
            ))}
            {MAGNITUDE_ORDER.map((type) => (
              <MagnitudeButton
                key={`pos-${type}`}
                value={MAGNITUDE_VALUES[type]}
                sign={1}
                onClick={() => onRequestLog(c, type, 1)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
