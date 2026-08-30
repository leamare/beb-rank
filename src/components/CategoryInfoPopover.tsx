import { createPortal } from 'react-dom'
import type { Category } from '../domain/categories'

interface Props {
  category: Category
  anchorRect: DOMRect
  onClose: () => void
}

const WIDTH = 200
const MARGIN = 8

export function CategoryInfoPopover({ category, anchorRect, onClose }: Props) {
  const left = Math.min(
    Math.max(anchorRect.left + anchorRect.width / 2 - WIDTH / 2, MARGIN),
    window.innerWidth - WIDTH - MARGIN,
  )
  const spaceBelow = window.innerHeight - anchorRect.bottom
  const top = spaceBelow > 120 ? anchorRect.bottom + 6 : undefined
  const bottom = top === undefined ? window.innerHeight - anchorRect.top + 6 : undefined

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 rounded-lg bg-surface-2 p-2.5 text-xs leading-snug text-ink-soft shadow-xl"
        style={{ left, top, bottom, width: WIDTH }}
      >
        <div className="mb-1 flex items-center gap-1.5 font-medium text-ink">
          <span>{category.emoji}</span>
          {category.label}
        </div>
        {category.description}
      </div>
    </>,
    document.body,
  )
}
