import { match } from 'ts-pattern'

import { chainPosition } from './chain-position'
import type { AnchoredNode } from './types'

// A chain places its children, so a chain child shows its place there instead of an anchor.
export function anchorText({ node, chain }: AnchoredNode): string {
  if (chain !== undefined) return chainPosition(chain)
  if (node.anchor === undefined) return 'default'
  return match(node.anchor)
    .with({ type: 'slot' }, ({ ref, attach = 'center' }) => `${ref} · ${attach}`)
    .with({ type: 'group' }, ({ ref }) => ref)
    .exhaustive()
}
