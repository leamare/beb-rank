import { useMemo, useState } from 'react'
import { useApp } from '../../state/AppContext'
import { CategoryLogGrid } from '../log/CategoryLogGrid'
import { ReasonModal, type PendingLog } from '../log/ReasonModal'
import { RecentLogsList } from '../RecentLogsList'
import type { Category } from '../../domain/categories'
import { requiresReason, signedDelta, type MagnitudeType } from '../../domain/points'
import { todaysTotals } from '../../domain/dailyTotals'

export function MainTab() {
  const { categories, logs, addLog, removeLog } = useApp()
  const [pending, setPending] = useState<PendingLog | null>(null)

  const totals = useMemo(() => todaysTotals(logs, categories), [logs, categories])

  function requestLog(category: Category, type: MagnitudeType, sign: 1 | -1) {
    const delta = signedDelta(type, sign)
    if (requiresReason(delta)) {
      setPending({ category, type, sign, delta })
    } else {
      void addLog(category.key, type, sign, '')
    }
  }

  function confirmPending(reason: string) {
    if (!pending) return
    void addLog(pending.category.key, pending.type, pending.sign, reason)
    setPending(null)
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <section>
        <h2 className="mb-2 text-sm font-medium text-[#898781]">Today's standings</h2>
        <CategoryLogGrid categories={categories} totals={totals} onRequestLog={requestLog} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-[#898781]">Recent</h2>
        <RecentLogsList logs={logs} categories={categories} onDelete={(id) => void removeLog(id)} />
      </section>

      {pending && (
        <ReasonModal pending={pending} onConfirm={confirmPending} onCancel={() => setPending(null)} />
      )}
    </div>
  )
}
