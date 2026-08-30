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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-[#fcfcfb] p-5 sm:rounded-2xl dark:bg-[#1a1a19]">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#0b0b0b] dark:text-white">
          <span className="text-xl">{pending.category.emoji}</span>
          {pending.category.label}
          <span className={pending.delta > 0 ? 'text-[#006300]' : 'text-[#e34948]'}>
            {pending.delta > 0 ? '+' : ''}
            {pending.delta}
          </span>
        </div>
        <p className="mb-2 text-xs text-[#898781]">This shift needs a reason.</p>
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What caused this?"
          rows={3}
          className="w-full rounded-lg border border-[#c3c2b7] bg-transparent p-2 text-sm text-[#0b0b0b] outline-none focus:border-[#2a78d6] dark:text-white"
        />
        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-[#c3c2b7] py-2 text-sm text-[#52514e] dark:text-[#c3c2b7]"
          >
            Cancel
          </button>
          <button
            onClick={() => trimmed && onConfirm(trimmed)}
            disabled={!trimmed}
            className="flex-1 rounded-lg bg-[#2a78d6] py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Log it
          </button>
        </div>
      </div>
    </div>
  )
}
