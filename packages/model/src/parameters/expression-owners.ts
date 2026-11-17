import { InvariantError } from '@keeb-cad/result'
import type { Design, Frozen, Id, ItemId } from '@keeb-cad/schema'

import { nodeAtPath, nodePaths } from '../ids/node-at-path'
import type { Path } from '../references/types'

// The item each expression path belongs to, each once in the order of `paths`: meta by meta.id, a
// parameter by its name, a part by its id, a node by the innermost node holding the path. Items
// are told apart by section too, since a node and a parameter may share a name.
export function expressionOwners(design: Frozen<Design>, paths: Iterable<Path>): ItemId[] {
  const nodes = nodePaths(design.layout)
  const owners = new Map<string, ItemId>()
  for (const path of paths) {
    const owner = ownerOf(design, nodes, path)
    owners.set(`${String(path[0])} ${owner}`, owner)
  }
  return [...owners.values()]
}

function ownerOf(design: Frozen<Design>, nodes: ReadonlyMap<string, Id>, path: Path): ItemId {
  const [section, index] = path
  if (section === 'meta') return design.meta.id
  if (section === 'parameters') return itemAt(design.parameters, index, path).name
  if (section === 'parts') return itemAt(design.parts, index, path).id
  return nodeAtPath(nodes, path).match({
    some: ({ id }) => id,
    none: () => {
      throw new InvariantError(`The expression at ${path.join('/')} belongs to no item.`)
    },
  })
}

function itemAt<T>(items: readonly T[], index: string | number | undefined, path: Path): T {
  const item = typeof index === 'number' ? items[index] : undefined
  if (item === undefined) {
    throw new InvariantError(`The expression at ${path.join('/')} belongs to no item.`)
  }
  return item
}
