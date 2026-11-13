import type { Reference } from './types'

// An anchor naming a slot or a group: the references that point into the layout.
export function isNodeReference({ kind }: Reference): boolean {
  return kind === 'slot' || kind === 'group'
}
