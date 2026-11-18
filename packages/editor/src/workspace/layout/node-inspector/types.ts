import type { SetOffset } from '@keeb-cad/commands'
import type { Frozen, Id, Node } from '@keeb-cad/schema'
import type * as v from 'valibot'

// Where a chain child sits in its chain; index is 0-based.
export interface ChainPlace {
  parent: Id
  index: number
  count: number
}

export interface AnchoredNode {
  node: Frozen<Node>
  // Set on a chain child alone.
  chain?: ChainPlace | undefined
}

export type NodeSectionProps = { nodes: readonly Frozen<Node>[] }

export type AnchorSectionProps = { nodes: readonly AnchoredNode[] }

export interface OffsetTexts {
  x: string
  y: string
  rot: string
  pivotX: string
  pivotY: string
}

export type ArrangementOption = 'free' | 'chain x' | 'chain y'

export interface OffsetField {
  label: string
  text: keyof OffsetTexts
  schema: v.GenericSchema
  edit: (expression: string) => Omit<v.InferInput<typeof SetOffset.input>, 'ids'>
  groupsOnly: boolean
}
