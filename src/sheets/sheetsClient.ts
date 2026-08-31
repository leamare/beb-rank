import { ensureFreshToken, invalidateIfScopeError } from '../auth/googleAuth'
import { readMarkedSpreadsheetId, writeMarkedSpreadsheetId } from './driveAppData'
import { DEFAULT_CATEGORIES, type Category, type CategoryKey } from '../domain/categories'
import type { LogEntry } from '../domain/log'
import type { MagnitudeType } from '../domain/points'

const API_ROOT = 'https://sheets.googleapis.com/v4/spreadsheets'
const STORAGE_KEY = 'bmc_spreadsheet_id'

const LOGS_SHEET = 'Logs'
const CONFIG_SHEET = 'Config'
const LOGS_HEADER = ['id', 'timestamp', 'date', 'category', 'type', 'delta', 'reason']
const CONFIG_HEADER = ['category', 'label', 'emoji', 'basePoints']

let spreadsheetId: string | null = localStorage.getItem(STORAGE_KEY)

export function getSpreadsheetId(): string | null {
  return spreadsheetId
}

export function getSpreadsheetUrl(): string | null {
  return spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : null
}

export function setSpreadsheetId(id: string): void {
  spreadsheetId = id
  localStorage.setItem(STORAGE_KEY, id)
}

export function forgetSpreadsheet(): void {
  spreadsheetId = null
  localStorage.removeItem(STORAGE_KEY)
}

async function sheetsFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await ensureFreshToken()
  const res = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    invalidateIfScopeError(res.status, body)
    throw new Error(`Sheets API ${res.status}: ${body}`)
  }
  return res
}

function requireSpreadsheetId(): string {
  if (!spreadsheetId) throw new Error('No spreadsheet connected')
  return spreadsheetId
}

export async function createSpreadsheet(title = 'Baby Management Counter'): Promise<string> {
  const res = await sheetsFetch('', {
    method: 'POST',
    body: JSON.stringify({ properties: { title } }),
  })
  const data = await res.json()
  setSpreadsheetId(data.spreadsheetId)
  return data.spreadsheetId
}

interface SheetMeta {
  sheetId: number
  title: string
}

async function getSheetsMeta(): Promise<SheetMeta[]> {
  const res = await sheetsFetch(`/${requireSpreadsheetId()}?fields=sheets.properties`)
  const data = await res.json()
  return data.sheets.map((s: { properties: { sheetId: number; title: string } }) => s.properties)
}

async function addSheet(title: string): Promise<void> {
  await sheetsFetch(`/${requireSpreadsheetId()}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] }),
  })
}

async function appendRow(range: string, row: unknown[]): Promise<void> {
  await sheetsFetch(
    `/${requireSpreadsheetId()}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
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

/**
 * The spreadsheet ID lives in a hidden marker file in the signed-in account's
 * Drive app-data folder — not just local storage — so every device signed
 * into the same Google account converges on the same sheet.
 */
async function resolveSpreadsheetId(): Promise<string> {
  const marked = await readMarkedSpreadsheetId()
  if (marked) {
    setSpreadsheetId(marked)
    return marked
  }
  const created = await createSpreadsheet()
  // Race guard: another device may have written a marker in the time it took
  // to create this sheet. Re-check and defer to whichever one landed first
  // instead of blindly overwriting it.
  const recheck = await readMarkedSpreadsheetId()
  if (recheck) {
    setSpreadsheetId(recheck)
    return recheck
  }
  await writeMarkedSpreadsheetId(created)
  return created
}

export async function switchToSpreadsheet(id: string): Promise<void> {
  setSpreadsheetId(id)
  await ensureStructure()
  await writeMarkedSpreadsheetId(id)
}

export async function connect(): Promise<void> {
  await resolveSpreadsheetId()
  try {
    await ensureStructure()
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (!message.includes('404')) throw err
    // Marked sheet no longer exists (e.g. deleted in Drive) — replace it and
    // update the shared marker so other devices pick up the new one too.
    forgetSpreadsheet()
    const created = await createSpreadsheet()
    await writeMarkedSpreadsheetId(created)
    await ensureStructure()
  }
}

export async function clearLogs(): Promise<void> {
  await sheetsFetch(`/${requireSpreadsheetId()}/values/${LOGS_SHEET}!A2:G:clear`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

async function getSheetId(title: string): Promise<number> {
  const sheets = await getSheetsMeta()
  const sheet = sheets.find((s) => s.title === title)
  if (!sheet) throw new Error(`Sheet "${title}" not found`)
  return sheet.sheetId
}

export async function getLogs(): Promise<LogEntry[]> {
  const res = await sheetsFetch(`/${requireSpreadsheetId()}/values/${LOGS_SHEET}!A2:G`)
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
  const res = await sheetsFetch(`/${requireSpreadsheetId()}/values/${LOGS_SHEET}!A2:A`)
  const data = await res.json()
  const rows: string[][] = data.values ?? []
  const rowIndex = rows.findIndex((r) => r[0] === id)
  if (rowIndex === -1) return

  const sheetId = await getSheetId(LOGS_SHEET)
  await sheetsFetch(`/${requireSpreadsheetId()}:batchUpdate`, {
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
  const res = await sheetsFetch(`/${requireSpreadsheetId()}/values/${CONFIG_SHEET}!A2:D`)
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
        description: known?.description ?? '',
      }
    })
}

export async function updateConfig(categories: Category[]): Promise<void> {
  const res = await sheetsFetch(`/${requireSpreadsheetId()}/values/${CONFIG_SHEET}!A2:D`)
  const data = await res.json()
  const rows: string[][] = data.values ?? []

  const updates = categories
    .map((c) => {
      const rowIndex = rows.findIndex((r) => r[0] === c.key)
      if (rowIndex === -1) return null
      const rowNumber = rowIndex + 2
      return {
        range: `${CONFIG_SHEET}!A${rowNumber}:D${rowNumber}`,
        values: [[c.key, c.label, c.emoji, c.basePoints]],
      }
    })
    .filter((u): u is { range: string; values: (string | number)[][] } => u !== null)

  if (updates.length === 0) return
  await sheetsFetch(`/${requireSpreadsheetId()}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ valueInputOption: 'RAW', data: updates }),
  })
}
