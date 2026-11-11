import type { DisplayUnit, FormatOptions } from './types'

const DECIMALS = 2
const MINUS = '−'
const UNIT_SUFFIX: Readonly<Record<DisplayUnit, string>> = {
  mm: ' mm',
  deg: '°',
  s: ' s',
  percent: '%',
  none: '',
}

/** It rounds the shortest decimal string, because binary `toFixed` turns `1.005` into `1.00`. */
export function formatNumber(
  value: number,
  unit: DisplayUnit,
  { readout = false }: FormatOptions = {},
): string {
  if (!Number.isFinite(value)) throw new RangeError(`Cannot format ${value} as a number.`)
  const { whole, fraction } = decimalDigits(Math.abs(value))
  const rounded = roundHalfUp(whole, fraction)
  const text = rounded.fraction === '' ? rounded.whole : `${rounded.whole}.${rounded.fraction}`
  const moved = !readout && (rounded.whole !== whole || rounded.fraction !== fraction)
  const sign = value < 0 && text !== '0' ? MINUS : ''
  return `${moved ? '≈ ' : ''}${sign}${text}${UNIT_SUFFIX[unit]}`
}

/** The shortest decimal string of a finite, non-negative `value`, exponent forms expanded. */
function decimalDigits(value: number): { whole: string; fraction: string } {
  const [mantissa = '', exponent = '0'] = String(value).split('e', 2)
  const [head = '', tail = ''] = mantissa.split('.', 2)
  const digits = head + tail
  const point = head.length + Number(exponent)
  const padded = point <= 0 ? '0'.repeat(1 - point) + digits : digits.padEnd(point, '0')
  const at = Math.max(point, 1)
  return {
    whole: padded.slice(0, at).replace(/^0+(?=\d)/, ''),
    fraction: padded.slice(at).replace(/0+$/, ''),
  }
}

function roundHalfUp(whole: string, fraction: string): { whole: string; fraction: string } {
  if (fraction.length <= DECIMALS) return { whole, fraction }
  const kept = BigInt(whole + fraction.slice(0, DECIMALS))
  const up = Number(fraction[DECIMALS]) >= 5 ? 1n : 0n
  const digits = (kept + up).toString().padStart(DECIMALS + 1, '0')
  return {
    whole: digits.slice(0, -DECIMALS),
    fraction: digits.slice(-DECIMALS).replace(/0+$/, ''),
  }
}
