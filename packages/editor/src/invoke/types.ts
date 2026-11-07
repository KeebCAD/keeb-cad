import type { ActionHandle, CommandHandle } from '@keeb-cad/design'
import type * as v from 'valibot'

import type { UiActionHandle } from '../ui-actions/types'

export type EntryHandle = CommandHandle | ActionHandle | UiActionHandle

export interface InputBuilder<Input> {
  input(): Input
}

export interface InputBuilderRegistration {
  readonly handle: EntryHandle
  readonly builder: new () => InputBuilder<unknown>
}

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

export interface BuilderInputMismatch {
  readonly builderInputMismatch: "input()'s result must be exactly v.InferInput of the handle's static input schema"
}

export type BuilderInputCheck<Input, Schema extends v.GenericSchema> =
  Same<Input, v.InferInput<Schema>> extends true ? unknown : BuilderInputMismatch
