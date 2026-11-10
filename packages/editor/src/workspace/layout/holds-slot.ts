import type { Frozen, Node } from '@keeb-cad/schema'

export function holdsSlot(node: Frozen<Node>): boolean {
  return 'children' in node ? node.children.some(holdsSlot) : true
}
