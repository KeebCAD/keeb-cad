import type { Stamp } from '@keeb-cad/messaging'
import type {
  Design,
  DesignPatch,
  FingerprintsFile,
  Frozen,
  Revision,
  RoutingFile,
  StageId,
  Violation,
  Workspace,
} from '@keeb-cad/schema'

export type ModelWorkerMessage = Stamp &
  (
    | {
        kind: 'design'
        design: Frozen<Design>
        routing: Frozen<RoutingFile>
        fingerprints: Frozen<FingerprintsFile>
        revision: Revision
      }
    // Not Frozen: it would turn a patch's unknown value into {} and its path readonly, which
    // the patcher's apply refuses; the commit event hands patches over as this same type.
    | { kind: 'patches'; patches: readonly DesignPatch[]; revision: Revision }
    | { kind: 'focus'; workspace: Workspace }
    | { kind: 'issues'; violations: Frozen<Violation[]> }
    | { kind: 'stage-started'; stage: StageId }
    | {
        kind: 'derived-files'
        routing: Frozen<RoutingFile>
        fingerprints: Frozen<FingerprintsFile>
        revision: Revision
      }
  )

export type ToModelWorker = Extract<ModelWorkerMessage, { kind: 'design' | 'patches' | 'focus' }>

export type FromModelWorker = Extract<
  ModelWorkerMessage,
  { kind: 'issues' | 'stage-started' | 'derived-files' }
>

export type DesignKind = Extract<ModelWorkerMessage['kind'], 'design' | 'patches'>

export type WholeKind = Extract<DesignKind, 'design'>
