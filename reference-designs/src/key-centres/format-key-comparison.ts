import type { KeyComparison } from './types'

const mm = (n: number) => `${n.toFixed(4)} mm`

/** Every key's deviation, then every failing, missing, extra and duplicate key by name. */
export function formatKeyComparison(result: KeyComparison): string {
  const { tolerances: tol } = result
  const failing = result.keys.filter((k) => !k.pass)
  const lines = [
    `${result.pass ? 'PASS' : 'FAIL'}: ${result.keys.length} keys compared ` +
      `(position ≤ ${mm(tol.position)}, rotation ≤ ${mm(tol.rotation)})`,
    ...result.keys.map(
      (k) =>
        `  ${k.pass ? 'ok  ' : 'FAIL'} ${k.name}: position ${mm(k.position)}, ` +
        `rotation ${k.rotationDeg.toFixed(4)}° = ${mm(k.rotation)}`,
    ),
  ]
  if (failing.length > 0) lines.push(`failing: ${failing.map((k) => k.name).join(', ')}`)
  if (result.missing.length > 0) lines.push(`missing: ${result.missing.join(', ')}`)
  if (result.extra.length > 0) lines.push(`extra: ${result.extra.join(', ')}`)
  if (result.duplicate.length > 0) lines.push(`duplicate: ${result.duplicate.join(', ')}`)
  return lines.join('\n')
}
