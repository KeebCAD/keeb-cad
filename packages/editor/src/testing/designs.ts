import type { Design, Node } from '@keeb-cad/schema'
import { aDesign, aLayout, anId, aSlot } from '@keeb-cad/schema/testing'

export function designWith(...slots: string[]): Design {
  return designOf(slots.map((id) => aSlot({ id: anId(id) })))
}

export function designOf(children: Node[]): Design {
  return aDesign({ layout: aLayout({ id: anId('root'), children }) })
}
