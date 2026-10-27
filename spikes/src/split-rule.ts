// The connection split rule (AD-14), fixed by the routing spike. See SPLIT-RULE.md.
// Position-free by signature: it sees a net id and pad ids, nothing else.

/** A pad-to-pad connection that a router must realise (or that a key cell already does). */
export interface SplitConnection {
  /** `<net>:<padA>~<padB>`, padA < padB in natural order. */
  id: string
  net: string
  padA: string
  padB: string
}

const CHUNK = /\d+|\D+/g

/**
 * Natural order: digit runs compare as numbers (`D2` < `D10`), other runs by code unit, so the
 * order is locale-free and total. At the first chunk that differs, equal-valued digit runs with
 * different spellings (`01`, `1`) are decided there by code unit, so `a01b` < `a1a`.
 */
export function naturalCompare(a: string, b: string): number {
  const ca = a.match(CHUNK) ?? []
  const cb = b.match(CHUNK) ?? []
  for (let i = 0; i < Math.min(ca.length, cb.length); i++) {
    const x = ca[i]!
    const y = cb[i]!
    if (x === y) continue
    const dx = /^\d/.test(x)
    const dy = /^\d/.test(y)
    if (dx && dy) {
      const diff = Number(x) - Number(y)
      if (diff !== 0) return diff
    }
    return x < y ? -1 : 1
  }
  if (ca.length !== cb.length) return ca.length - cb.length
  return a < b ? -1 : a > b ? 1 : 0
}

/** The canonical connection id: the net id plus its two pad ids in natural order. */
export function connectionId(net: string, padA: string, padB: string): string {
  if (padA === padB) throw new Error(`Connection on net ${net} joins pad ${padA} to itself`)
  const [a, b] = naturalCompare(padA, padB) < 0 ? [padA, padB] : [padB, padA]
  return `${net}:${a}~${b}`
}

/**
 * The split rule: a chain. Sort the net's pad ids in natural order and join each to the next,
 * giving n−1 connections with no pad on more than two. Fewer than two pads give none.
 */
export function splitNet(net: string, padIds: readonly string[]): SplitConnection[] {
  const sorted = [...padIds].sort(naturalCompare)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1]) throw new Error(`Pad id ${sorted[i]} listed twice on net ${net}`)
  }
  return sorted.slice(1).map((padB, i) => {
    const padA = sorted[i]!
    return { id: connectionId(net, padA, padB), net, padA, padB }
  })
}
