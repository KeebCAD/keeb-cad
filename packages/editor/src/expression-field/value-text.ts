import type { Unit } from '@keeb-cad/schema'
import { formatNumber } from '@keeb-cad/ui'

// `= 5.37 mm` for an exact value, `≈ 5.37 mm` when the display rounds it.
export function valueText(value: number, unit: Unit | 'none' = 'none'): string {
  const formatted = formatNumber(value, unit)
  return formatted.startsWith('≈') ? formatted : `= ${formatted}`
}
