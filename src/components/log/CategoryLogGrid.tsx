import { useState } from 'react'
import type { Category, CategoryKey } from '../../domain/categories'
import { MAGNITUDE_ORDER, MAGNITUDE_VALUES, type MagnitudeType } from '../../domain/points'
import { CategoryInfoPopover } from '../CategoryInfoPopover'

interface Props {
  categories: Category[]
  totals: Record<CategoryKey, number>
  onRequestLog: (category: Category, type: MagnitudeType, sign: 1 | -1) => void
}

const BOLD_TYPES: MagnitudeType[] = ['major', 'massive']

function MagnitudeButton({
  value,
  sign,
  bold,
  onClick,
}: {
  value: number
  sign: 1 | -1
  bold: boolean
  onClick: () => void
}) {
  const positive = sign === 1
  const base = bold
    ? positive
      ? 'bg-positive text-app'
      : 'bg-negative text-app'
    : positive
      ? 'bg-positive-bg text-positive'
      : 'bg-negative-bg text-negative'

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-md py-1.5 text-xs font-medium transition-all hover:brightness-125 hover:scale-[1.03] active:scale-95 ${base}`}
    >
      {positive ? '+' : '-'}
      {value}
    </button>
  )
}

export function CategoryLogGrid({ categories, totals, onRequestLog }: Props) {
  const [openInfo, setOpenInfo] = useState<{ key: CategoryKey; rect: DOMRect } | null>(null)

  return (
    <div className="grid grid-cols-6 gap-1 sm:gap-2">
      {categories.map((c) => (
        <div key={c.key} className="relative flex min-w-0 flex-col items-center gap-1 rounded-xl border border-border bg-surface p-1 sm:gap-1.5 sm:p-2">
          <button
            onClick={(e) =>
              setOpenInfo(openInfo?.key === c.key ? null : { key: c.key, rect: e.currentTarget.getBoundingClientRect() })
            }
            className="flex w-full flex-col items-center gap-0.5"
          >
            <span className="text-base leading-none sm:text-xl">{c.emoji}</span>
            <span className="hidden truncate text-[10px] font-medium text-ink-soft sm:block">{c.label}</span>
            <span className="text-sm font-semibold sm:text-base" style={{ color: c.color }}>
              {totals[c.key]}
            </span>
          </button>

          {openInfo?.key === c.key && (
            <CategoryInfoPopover category={c} anchorRect={openInfo.rect} onClose={() => setOpenInfo(null)} />
          )}

          <div className="flex w-full flex-col gap-1">
            {MAGNITUDE_ORDER.slice()
              .reverse()
              .map((type) => (
                <MagnitudeButton
                  key={`pos-${type}`}
                  value={MAGNITUDE_VALUES[type]}
                  sign={1}
                  bold={BOLD_TYPES.includes(type)}
                  onClick={() => onRequestLog(c, type, 1)}
                />
              ))}
            <div className="my-0.5 h-px w-full bg-border" />
            {MAGNITUDE_ORDER.map((type) => (
              <MagnitudeButton
                key={`neg-${type}`}
                value={MAGNITUDE_VALUES[type]}
                sign={-1}
                bold={BOLD_TYPES.includes(type)}
                onClick={() => onRequestLog(c, type, -1)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
