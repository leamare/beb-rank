import { useState } from 'react'
import type { Category } from '../../domain/categories'
import type { MagnitudeType } from '../../domain/points'

export interface PendingLog {
  category: Category
  type: MagnitudeType
  sign: 1 | -1
  delta: number
}

interface Props {
  pending: PendingLog
  onConfirm: (reason: string) => void
  onCancel: () => void
}

export function ReasonModal({ pending, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState('')
  const trimmed = reason.trim()

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-surface p-5 sm:rounded-2xl">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
          <span className="text-xl">{pending.category.emoji}</span>
          {pending.category.label}
          <span className={pending.delta > 0 ? 'text-positive' : 'text-negative'}>
            {pending.delta > 0 ? '+' : ''}
            {pending.delta}
          </span>
        </div>
        <p className="mb-2 text-xs text-muted">This shift needs a reason.</p>
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What caused this?"
          rows={3}
          className="w-full rounded-lg border border-border bg-transparent p-2 text-sm text-ink outline-none focus:border-accent"
        />
        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border py-2 text-sm text-ink-soft transition-colors hover:bg-surface-2"
          >
            Cancel
          </button>
          <button
            onClick={() => trimmed && onConfirm(trimmed)}
            disabled={!trimmed}
            className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-white transition-colors hover:bg-accent-soft disabled:opacity-40"
          >
            Log it
          </button>
        </div>
      </div>
    </div>
  )
}
