import type { Option } from '@keeb-cad/result'
import type { DesignPatch, Frozen, RoutingFile } from '@keeb-cad/schema'

export interface UndoEntry {
  coalesce: Option<string>
  forward: readonly DesignPatch[]
  inverse: readonly DesignPatch[]
}

export interface PatchReplay {
  patches: readonly DesignPatch[]
  routing: Frozen<RoutingFile>
}
