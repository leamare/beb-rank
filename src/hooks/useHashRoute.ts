import { useEffect, useState } from 'react'

export type Tab = 'main' | 'log' | 'dynamics' | 'settings'

function parseHash(): Tab {
  const hash = window.location.hash.replace('#/', '')
  if (hash === 'log' || hash === 'dynamics' || hash === 'settings') return hash
  return 'main'
}

export function useHashRoute(): [Tab, (tab: Tab) => void] {
  const [tab, setTab] = useState<Tab>(parseHash())

  useEffect(() => {
    const onHashChange = () => setTab(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (next: Tab) => {
    window.location.hash = next === 'main' ? '#/' : `#/${next}`
  }

  return [tab, navigate]
}
