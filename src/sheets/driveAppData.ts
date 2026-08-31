import { ensureFreshToken } from '../auth/googleAuth'

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files'
const MARKER_NAME = 'baby-management-counter.json'

async function driveFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await ensureFreshToken()
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Drive API ${res.status}: ${body}`)
  }
  return res
}

async function findMarkerFileId(): Promise<string | null> {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name='${MARKER_NAME}'`,
    fields: 'files(id)',
  })
  const res = await driveFetch(`${DRIVE_API}?${params}`)
  const data = await res.json()
  return data.files?.[0]?.id ?? null
}

export async function readMarkedSpreadsheetId(): Promise<string | null> {
  const fileId = await findMarkerFileId()
  if (!fileId) return null
  const res = await driveFetch(`${DRIVE_API}/${fileId}?alt=media`)
  const data = await res.json()
  return data.spreadsheetId ?? null
}

export async function writeMarkedSpreadsheetId(spreadsheetId: string): Promise<void> {
  const fileId = await findMarkerFileId()
  const body = JSON.stringify({ spreadsheetId })

  if (fileId) {
    await driveFetch(`${UPLOAD_API}/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    return
  }

  const boundary = 'bmc-boundary'
  const metadata = JSON.stringify({ name: MARKER_NAME, parents: ['appDataFolder'] })
  const multipartBody =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n` +
    `--${boundary}--`
  await driveFetch(`${UPLOAD_API}?uploadType=multipart`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: multipartBody,
  })
}
