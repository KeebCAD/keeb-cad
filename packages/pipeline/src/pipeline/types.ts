import type { ModelWorkerMessage } from '@keeb-cad/protocol'

export type DesignMessage = Extract<ModelWorkerMessage, { kind: 'design' }>
export type PatchesMessage = Extract<ModelWorkerMessage, { kind: 'patches' }>
