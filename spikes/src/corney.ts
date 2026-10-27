// Corney Island's committed Ergogen output, loaded with Vite `?raw` (no fs), plus its key list.
import wired from '../../fixtures/corney-island/ergogen/pcbs/corney_island.kicad_pcb?raw'
import wireless from '../../fixtures/corney-island/ergogen/pcbs/corney_island_wireless.kicad_pcb?raw'
import points from '../../fixtures/corney-island/ergogen/points/points.yaml?raw'

export const CORNEY = { wired, wireless } as const
export type CorneyDesign = keyof typeof CORNEY

/**
 * The point names tagged `key` in points.yaml, in point order. Key n (1-based) is S_n, with
 * D_n (B.Cu) and D_{n+keys} (F.Cu), and on wired LED_n. A line parser, since spikes/ has no
 * YAML dependency: a top-level `name:` opens a point, and any `- key` list item under it tags it.
 */
export function keysOf(pointsYaml: string): string[] {
  const keys: string[] = []
  let current: string | undefined
  for (const line of pointsYaml.split(/\r?\n/)) {
    const top = /^([A-Za-z0-9_]+):\s*$/.exec(line)
    if (top) current = top[1]
    else if (current && /^\s+- key\s*$/.test(line) && keys.at(-1) !== current) keys.push(current)
  }
  return keys
}

export const CORNEY_KEYS: readonly string[] = keysOf(points)
