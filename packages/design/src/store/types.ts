import type {
  Design,
  DesignPatch,
  FingerprintsFile,
  Frozen,
  Revision,
  RoutingFile,
} from '@keeb-cad/schema'

export interface DerivedFiles {
  routing: RoutingFile
  fingerprints: FingerprintsFile
}

export interface Committed {
  design: Frozen<Design>
  routing: Frozen<RoutingFile>
  fingerprints: Frozen<FingerprintsFile>
  seq: number
  revision: Revision
}

export type CommitEvent =
  | { kind: 'patches'; patches: readonly DesignPatch[]; seq: number; revision: Revision }
  | { kind: 'whole'; committed: Committed }

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
