import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { LogEntry } from '../domain/log'
import type { Category } from '../domain/categories'

export type PendingAction =
  | { id: string; kind: 'append'; entry: LogEntry; createdAt: number }
  | { id: string; kind: 'delete'; entryId: string; createdAt: number }

interface AppDB extends DBSchema {
  logs: {
    key: string
    value: LogEntry
    indexes: { 'by-date': string }
  }
  pending: {
    key: string
    value: PendingAction
  }
  meta: {
    key: string
    value: unknown
  }
}

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<AppDB>('baby-management', 1, {
      upgrade(db) {
        const logs = db.createObjectStore('logs', { keyPath: 'id' })
        logs.createIndex('by-date', 'date')
        db.createObjectStore('pending', { keyPath: 'id' })
        db.createObjectStore('meta')
      },
    })
  }
  return dbPromise
}

export async function getAllLogs(): Promise<LogEntry[]> {
  return (await getDb()).getAll('logs')
}

export async function putLog(entry: LogEntry): Promise<void> {
  await (await getDb()).put('logs', entry)
}

export async function putLogs(entries: LogEntry[]): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('logs', 'readwrite')
  await Promise.all(entries.map((e) => tx.store.put(e)))
  await tx.done
}

export async function deleteLogLocal(id: string): Promise<void> {
  await (await getDb()).delete('logs', id)
}

export async function enqueuePending(action: PendingAction): Promise<void> {
  await (await getDb()).put('pending', action)
}

export async function getPending(): Promise<PendingAction[]> {
  return (await getDb()).getAll('pending')
}

export async function removePending(id: string): Promise<void> {
  await (await getDb()).delete('pending', id)
}

export async function clearAllLogs(): Promise<void> {
  const db = await getDb()
  await db.clear('logs')
  await db.clear('pending')
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await getDb()).get('meta', key) as Promise<T | undefined>
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await (await getDb()).put('meta', value, key)
}

export async function getCachedConfig(): Promise<Category[] | undefined> {
  return getMeta<Category[]>('config')
}

export async function setCachedConfig(categories: Category[]): Promise<void> {
  await setMeta('config', categories)
}
