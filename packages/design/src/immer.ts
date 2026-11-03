import { type Draft, enablePatches, freeze, Immer, type Patch } from 'immer'

import type { Design, Frozen } from '@keeb-cad/schema'

// The register's Immer file: the one place that sets Immer up and the only importer of `immer`
// (AD-2). `design/worker` imports it too, for `applyDesignPatches`, without reaching the register
// service, `di` or `model/main`.

enablePatches()
const immer = new Immer({ autoFreeze: true })

/** An apply step's draft (AD-2). Assignable to `Mutable<T>`; no Immer type leaves `design`. */
export type Writable<T> = Draft<T>

/** One change to the design: Immer's patch shape, as plain data. */
export type DesignPatch = {
  op: 'add' | 'remove' | 'replace'
  path: (string | number)[]
  value?: unknown
}

/**
 * Deep-freezes a plain value in place with Immer's `freeze(value, true)` and returns it. `freeze`
 * returns early on an object that is already frozen, so a value Immer's auto-freeze produced
 * passes through unchanged.
 */
export function deepFreeze<T>(value: T): Frozen<T> {
  return freeze(value, true) as Frozen<T>
}

/**
 * Runs `recipe` on a draft of `base` and returns the produced value, its patches and what the
 * recipe returned. The recipe's return value never reaches Immer, so a returned `Rejection` is not
 * taken for a replacement value.
 */
export function produceDesign<R>(
  base: Frozen<Design>,
  recipe: (draft: Writable<Design>) => R,
): { design: Frozen<Design>; patches: DesignPatch[]; returned: R } {
  let returned!: R
  const [design, patches] = immer.produceWithPatches(base as Design, (draft: Writable<Design>) => {
    returned = recipe(draft)
  })
  return { design: deepFreeze(design), patches: patches as DesignPatch[], returned }
}

/** Applies a commit's patches to a design and deep-freezes the result: the one patch applier. */
export function applyDesignPatches(
  design: Frozen<Design>,
  patches: readonly DesignPatch[],
): Frozen<Design> {
  return deepFreeze(immer.applyPatches(design as Design, patches as readonly Patch[]))
}
