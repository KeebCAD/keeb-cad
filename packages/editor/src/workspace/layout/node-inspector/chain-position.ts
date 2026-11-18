import type { ChainPlace } from './types'

// 1-based for the person; the index stays 0-based in the design.
export function chainPosition({ parent, index, count }: ChainPlace): string {
  return `chain ${parent} · ${index + 1} of ${count}`
}
