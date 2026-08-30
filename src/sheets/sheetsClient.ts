import { ensureFreshToken } from '../auth/googleAuth'
import { DEFAULT_CATEGORIES, type Category, type CategoryKey } from '../domain/categories'
import type { LogEntry } from '../domain/log'
import type { MagnitudeType } from '../domain/points'

const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID as string
const BASE = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`

const LOGS_SHEET = 'Logs'
const CONFIG_SHEET = 'Config'
const LOGS_HEADER = ['id', 'timestamp', 'date', 'category', 'type', 'delta', 'reason']
const CONFIG_HEADER = ['category', 'label', 'emoji', 'basePoints']

async function sheetsFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await ensureFreshToken()
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Sheets API ${res.status}: ${body}`)
  }
  return res
}

interface SheetMeta {
  sheetId: number
  title: string
}

async function getSheetsMeta(): Promise<SheetMeta[]> {
  const res = await sheetsFetch('?fields=sheets.properties')
  const data = await res.json()
  return data.sheets.map((s: { properties: { sheetId: number; title: string } }) => s.properties)
}

async function addSheet(title: string): Promise<void> {
  await sheetsFetch(':batchUpdate', {
    method: 'POST',
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] }),
  })
}

async function appendRow(range: string, row: unknown[]): Promise<void> {
  await sheetsFetch(
    `/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values: [row] }) },
  )
}

export async function ensureStructure(): Promise<void> {
  const sheets = await getSheetsMeta()
  const titles = sheets.map((s) => s.title)

  if (!titles.includes(LOGS_SHEET)) {
    await addSheet(LOGS_SHEET)
    await appendRow(`${LOGS_SHEET}!A1`, LOGS_HEADER)
  }
  if (!titles.includes(CONFIG_SHEET)) {
    await addSheet(CONFIG_SHEET)
    await appendRow(`${CONFIG_SHEET}!A1`, CONFIG_HEADER)
    for (const c of DEFAULT_CATEGORIES) {
      await appendRow(`${CONFIG_SHEET}!A1`, [c.key, c.label, c.emoji, c.basePoints])
    }
  }
}

async function getSheetId(title: string): Promise<number> {
  const sheets = await getSheetsMeta()
  const sheet = sheets.find((s) => s.title === title)
  if (!sheet) throw new Error(`Sheet "${title}" not found`)
  return sheet.sheetId
}

export async function getLogs(): Promise<LogEntry[]> {
  const res = await sheetsFetch(`/values/${LOGS_SHEET}!A2:G`)
  const data = await res.json()
  const rows: string[][] = data.values ?? []
  return rows
    .filter((r) => r.length >= 7 && r[0])
    .map((r) => ({
      id: r[0],
      timestamp: r[1],
      date: r[2],
      category: r[3] as CategoryKey,
      type: r[4] as MagnitudeType,
      delta: Number(r[5]),
      reason: r[6] ?? '',
    }))
}

export async function appendLog(entry: LogEntry): Promise<void> {
  await appendRow(`${LOGS_SHEET}!A1`, [
    entry.id,
    entry.timestamp,
    entry.date,
    entry.category,
    entry.type,
    entry.delta,
    entry.reason,
  ])
}

export async function deleteLogRemote(id: string): Promise<void> {
  const res = await sheetsFetch(`/values/${LOGS_SHEET}!A2:A`)
  const data = await res.json()
  const rows: string[][] = data.values ?? []
  const rowIndex = rows.findIndex((r) => r[0] === id)
  if (rowIndex === -1) return

  const sheetId = await getSheetId(LOGS_SHEET)
  await sheetsFetch(':batchUpdate', {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex + 1,
              endIndex: rowIndex + 2,
            },
          },
        },
      ],
    }),
  })
}

export async function getConfig(): Promise<Category[]> {
  const res = await sheetsFetch(`/values/${CONFIG_SHEET}!A2:D`)
  const data = await res.json()
  const rows: string[][] = data.values ?? []
  if (rows.length === 0) return DEFAULT_CATEGORIES

  return rows
    .filter((r) => r.length >= 4 && r[0])
    .map((r, i) => {
      const known = DEFAULT_CATEGORIES.find((c) => c.key === r[0])
      return {
        key: r[0] as CategoryKey,
        label: r[1],
        emoji: r[2],
        basePoints: Number(r[3]),
        color: known?.color ?? DEFAULT_CATEGORIES[i % DEFAULT_CATEGORIES.length].color,
      }
    })
}
