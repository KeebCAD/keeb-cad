import * as v from 'valibot'

import { hash } from '@keeb-cad/hashing'
import { shallowRef } from '@keeb-cad/reactive'
import {
  designSchema,
  revisionSchema,
  type Design,
  type DesignInvalid,
  type Frozen,
  type Result,
  type Revision,
} from '@keeb-cad/schema'

import { deepFreeze, type DesignPatch } from './immer'
import { toSchemaIssues } from './issues'

/** What `design` emits at each commit and `replaceDesign` (AD-2). */
export type CommitEvent =
  | { kind: 'commit'; patches: DesignPatch[]; seq: number; revision: Revision }
  | { kind: 'replace'; design: Frozen<Design>; seq: number; revision: Revision }

export type CommitListener = (event: CommitEvent) => void

/** The register's write into the state; package-internal, so commands stay the only writers. */
export const COMMIT = Symbol('DesignState.commit')

/**
 * The design state (AD-2): the one design value, in a `shallowRef`, with its seq and revision.
 * Exactly two ways write it: registered commands (through the register) and `replaceDesign`.
 */
export class DesignState {
  readonly #design = shallowRef<Frozen<Design> | undefined>()
  #seq = 0
  #revision: Revision | undefined
  readonly #listeners = new Set<CommitListener>()

  /** The current design, deeply frozen; `undefined` before the first `replaceDesign`. */
  get design(): Frozen<Design> | undefined {
    return this.#design.value
  }

  /** Main's latest seq: +1 at every commit and `replaceDesign`. */
  get seq(): number {
    return this.#seq
  }

  /** The current design's revision; `undefined` before the first `replaceDesign`. */
  get revision(): Revision | undefined {
    return this.#revision
  }

  /** Subscribes to the commit event; returns the unsubscribe call. */
  onCommit(listener: CommitListener): () => void {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  /** Load, file open and version switch: parse, deep-freeze, write, and emit the whole value. */
  replaceDesign(value: unknown): Result<void, DesignInvalid> {
    const parsed = v.safeParse(designSchema, value)
    if (!parsed.success) {
      return { ok: false, error: { kind: 'design-invalid', issues: toSchemaIssues(parsed.issues) } }
    }
    const design = deepFreeze(parsed.output)
    const { seq, revision } = this.#write(design)
    this.#emit({ kind: 'replace', design, seq, revision })
    return { ok: true, value: undefined }
  }

  /** Writes a command's produced design and emits its patches. Called only by the register. */
  [COMMIT](design: Frozen<Design>, patches: DesignPatch[]): void {
    const { seq, revision } = this.#write(design)
    this.#emit({ kind: 'commit', patches, seq, revision })
  }

  #write(design: Frozen<Design>): { seq: number; revision: Revision } {
    // seq and revision first, so an effect on the ref reads the new ones.
    this.#seq += 1
    this.#revision = v.parse(revisionSchema, hash(design))
    this.#design.value = design
    return { seq: this.#seq, revision: this.#revision }
  }

  #emit(event: CommitEvent): void {
    for (const listener of this.#listeners) listener(event)
  }
}
