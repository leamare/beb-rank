export type MagnitudeType = 'minor' | 'stronger' | 'major' | 'massive'

export const MAGNITUDE_VALUES: Record<MagnitudeType, number> = {
  minor: 1,
  stronger: 2,
  major: 5,
  massive: 10,
}

export const MAGNITUDE_ORDER: MagnitudeType[] = ['minor', 'stronger', 'major', 'massive']

export const REASON_THRESHOLD = 5

export function requiresReason(delta: number): boolean {
  return Math.abs(delta) >= REASON_THRESHOLD
}

export function signedDelta(type: MagnitudeType, sign: 1 | -1): number {
  return MAGNITUDE_VALUES[type] * sign
}
