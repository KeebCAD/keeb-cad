import type { Gap } from '../types'
import { aLength } from './length'

export function aGap({ x = aLength('1mm'), y = aLength('1mm') }: Partial<Gap> = {}): Gap {
  return { x, y }
}
