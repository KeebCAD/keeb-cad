import type { Frozen, Group, Node, PartRef } from '@keeb-cad/schema'

import type { SlotPartRun } from './types'

export function slotPartRuns(layout: Frozen<Group>, defaultPart: PartRef): SlotPartRun[] {
  const runs: SlotPartRun[] = []
  const walk = (node: Frozen<Node>, groupDefaults: readonly PartRef[]): void => {
    if ('children' in node) {
      const defaults =
        node.defaultPart === undefined ? groupDefaults : [node.defaultPart, ...groupDefaults]
      for (const child of node.children) walk(child, defaults)
      return
    }
    const own = node.part === undefined ? [] : [node.part]
    runs.push({
      slot: node.id,
      levels: [...new Set([...own, ...groupDefaults, defaultPart])],
      inputs: node.inputs ?? {},
    })
  }
  walk(layout, [])
  return runs
}
