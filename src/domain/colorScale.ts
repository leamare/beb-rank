const BLUE_STEPS = ['#cde2fb', '#86b6ef', '#2a78d6', '#104281']
const RED_STEPS = ['#fbdcdc', '#f2a8a7', '#e34948', '#8a2020']
const NEUTRAL = '#f0efec'

export function divergingColor(value: number, scaleMax: number): string {
  if (scaleMax <= 0 || value === 0) return NEUTRAL
  const ratio = Math.min(Math.abs(value) / scaleMax, 1)
  const steps = value > 0 ? BLUE_STEPS : RED_STEPS
  const idx = Math.min(Math.floor(ratio * steps.length), steps.length - 1)
  return steps[idx]
}
