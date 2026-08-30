const BLUE_STEPS = ['#2a3358', '#3d4d82', '#5a72b8', '#8fa9f2']
const ROSE_STEPS = ['#402a44', '#6b3a5f', '#a3527f', '#e0a0c2']
const NEUTRAL = '#251f3d'

export function divergingColor(value: number, scaleMax: number): string {
  if (scaleMax <= 0 || value === 0) return NEUTRAL
  const ratio = Math.min(Math.abs(value) / scaleMax, 1)
  const steps = value > 0 ? BLUE_STEPS : ROSE_STEPS
  const idx = Math.min(Math.floor(ratio * steps.length), steps.length - 1)
  return steps[idx]
}
