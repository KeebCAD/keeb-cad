import { parse } from 'yaml'

import type { ErgogenPoint, KeyPose } from './types'

const KEY_TAG = 'key'
const WIDE_TAG = 'key_1_5u'
// From the config's `_keycap_outlines`: `key` is keycw × keych, `key_1_5u` is keycw*1.5 × keych.
const WIDE_FACTOR = 1.5

/** The key poses in Ergogen's points and units YAML: points tagged `key`, helpers excluded. */
export function keyPosesFrom(pointsYaml: string, unitsYaml: string): KeyPose[] {
  const units = parse(unitsYaml) as Record<string, unknown>
  const keycw = unit(units, 'keycw')
  const keych = unit(units, 'keych')
  const points = parse(pointsYaml) as Record<string, ErgogenPoint>

  return Object.entries(points)
    .filter(([, point]) => tagsOf(point).includes(KEY_TAG))
    .map(([name, point]) => {
      const wide = tagsOf(point).includes(WIDE_TAG)
      return {
        name,
        x: point.x,
        y: point.y,
        r: point.r,
        width: wide ? keycw * WIDE_FACTOR : keycw,
        height: keych,
      }
    })
}

function tagsOf(point: ErgogenPoint): string[] {
  const tags = point.meta?.tags
  if (typeof tags === 'string') return [tags]
  if (Array.isArray(tags)) return tags.filter((t): t is string => typeof t === 'string')
  if (tags && typeof tags === 'object') {
    return Object.entries(tags)
      .filter(([, on]) => on)
      .map(([tag]) => tag)
  }
  return []
}

function unit(units: Record<string, unknown>, name: string): number {
  const value = units[name]
  if (typeof value !== 'number') throw new TypeError(`Ergogen units lack numeric "${name}"`)
  return value
}
