import type { Design, DesignPatch, Frozen, Rejection } from '@keeb-cad/schema'
import type { Draft } from 'immer'

export type Writable<T> = Draft<T>

export interface Changed {
  design: Frozen<Design>
  patches: readonly DesignPatch[]
}

export type Edit = (draft: Writable<Design>) => void | Rejection
