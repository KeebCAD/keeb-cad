import type { BlueprintPin } from '@keeb-cad/blueprint'
import type { Endpoint } from '@keeb-cad/messaging'
import type { ModelWorkerMessage, ToModelWorker } from '@keeb-cad/protocol'
import type { LayoutOutput, ReadonlyRef, ResolvedParts } from '@keeb-cad/schema'

export type DesignMessage = Extract<ModelWorkerMessage, { kind: 'design' }>
export type PatchesMessage = Extract<ModelWorkerMessage, { kind: 'patches' }>

export interface PipelineDerivations {
  parts: ReadonlyRef<ResolvedParts>
  pins: ReadonlyRef<readonly BlueprintPin[]>
  placements: ReadonlyRef<LayoutOutput>
}

export type LatestDesignMessage = Pick<ToModelWorker, 'epoch' | 'seq'> & { endpoint: Endpoint }
