import { useState } from 'react'
import { useApp } from '../../state/AppContext'
import { DEFAULT_BASE_POINTS } from '../../domain/categories'

export function SettingsTab() {
  const { authStatus, categories, sheetUrl, updateCategories, switchSheet } = useApp()
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(categories.map((c) => [c.key, c.basePoints])),
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [sheetInput, setSheetInput] = useState('')
  const [switching, setSwitching] = useState(false)
  const [switchError, setSwitchError] = useState<string | null>(null)

  const dirty = categories.some((c) => values[c.key] !== c.basePoints)

  function resetToDefaults() {
    setValues(Object.fromEntries(categories.map((c) => [c.key, DEFAULT_BASE_POINTS])))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    try {
      await updateCategories(categories.map((c) => ({ ...c, basePoints: values[c.key] })))
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  async function useThisSheet() {
    if (!sheetInput.trim()) return
    setSwitching(true)
    setSwitchError(null)
    try {
      await switchSheet(sheetInput.trim())
      setSheetInput('')
    } catch (err) {
      setSwitchError(err instanceof Error ? err.message : 'Could not switch sheet')
    } finally {
      setSwitching(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      {authStatus === 'signedIn' && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">Connected sheet</h2>
          <p className="mb-3 text-xs text-muted">
            All your devices should point at the same sheet automatically. If two devices ever
            drift apart (e.g. both signed in for the first time around the same moment), paste the
            sheet you want to keep here to force every device back onto it.
          </p>
          {sheetUrl && (
            <a href={sheetUrl} target="_blank" rel="noreferrer" className="mb-2 block text-xs text-accent underline">
              {sheetUrl}
            </a>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={sheetInput}
              onChange={(e) => setSheetInput(e.target.value)}
              placeholder="Paste sheet URL or ID"
              className="flex-1 rounded-lg border border-border bg-transparent px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
            />
            <button
              onClick={() => void useThisSheet()}
              disabled={!sheetInput.trim() || switching}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-soft disabled:opacity-40"
            >
              {switching ? 'Switching…' : 'Use this sheet'}
            </button>
          </div>
          {switchError && <p className="mt-2 text-xs text-negative">{switchError}</p>}
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Baseline points</h2>
        <p className="mb-3 text-xs text-muted">
          Each category starts the day at its baseline, then moves up or down as you log points.
        </p>
        <div className="flex flex-col gap-2">
          {categories.map((c) => (
            <div key={c.key} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <span className="text-xl">{c.emoji}</span>
              <span className="flex-1 text-sm text-ink">{c.label}</span>
              <input
                type="number"
                value={values[c.key]}
                onChange={(e) => {
                  setValues((v) => ({ ...v, [c.key]: Number(e.target.value) }))
                  setSaved(false)
                }}
                className="w-16 rounded-lg border border-border bg-transparent px-2 py-1 text-right text-sm text-ink outline-none focus:border-accent"
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex gap-2">
        <button
          onClick={resetToDefaults}
          className="flex-1 rounded-lg border border-border py-2 text-sm text-ink-soft transition-colors hover:bg-surface"
        >
          Reset to defaults
        </button>
        <button
          onClick={() => void save()}
          disabled={!dirty || saving}
          className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-white transition-colors hover:bg-accent-soft disabled:opacity-40"
        >
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  )
}
