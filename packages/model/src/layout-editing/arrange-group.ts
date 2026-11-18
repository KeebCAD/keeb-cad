import type { Group, Mutable } from '@keeb-cad/schema'

import type { ArrangeableGroup, ArrangementEdit } from './types'

// A chain places its children, so they lose their anchors and keep their offsets; a free group
// has no axis.
export function arrangeGroup(group: Mutable<Group>, edit: ArrangementEdit): void {
  // The arrangement tags the group's type, so the group changes type in place.
  const fields = group as ArrangeableGroup
  fields.arrangement = edit.arrangement
  if (edit.arrangement === 'chain') {
    fields.axis = edit.axis
    for (const child of fields.children) delete child.anchor
  } else {
    delete fields.axis
  }
}
