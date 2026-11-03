import type { Design, Frozen, Revision } from '@keeb-cad/schema'

import type { DesignPatch } from '../patching/types'

export interface Committed {
  design: Frozen<Design>
  seq: number
  revision: Revision
}

export type CommitEvent =
  | { kind: 'patches'; patches: readonly DesignPatch[]; seq: number; revision: Revision }
  | { kind: 'whole'; design: Frozen<Design>; seq: number; revision: Revision }

export type DesignStoreEvents = {
  commit: (event: CommitEvent) => void
}

type Listeners<E> = { [K in keyof E]: (...arguments_: never[]) => void }

export interface TypedEmitter<E extends Listeners<E>> {
  on<K extends keyof E & string>(event: K, listener: E[K]): () => void
  emit<K extends keyof E & string>(event: K, ...arguments_: Parameters<E[K]>): void
}

export interface Subscribable<E extends Listeners<E>> {
  on<K extends keyof E & string>(event: K, listener: E[K]): () => void
}
