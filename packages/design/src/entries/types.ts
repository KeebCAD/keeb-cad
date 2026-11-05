import type { AsyncResult, Option } from '@keeb-cad/result'
import type { Design, Frozen, Rejection } from '@keeb-cad/schema'
import type * as v from 'valibot'

import type { Writable } from '../patching/types'
import type { Committed } from '../store/types'

// Methods rather than function properties, so an entry with a narrower input still fits the
// multi tokens' element type. That bivariance is also why the register functions check the
// input both ways themselves.
export interface Command<Input> {
  available(design: Frozen<Design>): boolean
  apply(draft: Writable<Design>, input: Input): void | Rejection
}

export interface Action<Input, E> {
  available(current: Option<Committed>): boolean
  apply(input: Input): AsyncResult<void, E>
}

export interface CommandHandle {
  readonly kind: 'command'
  readonly id: string
  readonly label: string
  readonly input: v.GenericSchema
  new (): Command<unknown>
}

export interface ActionHandle {
  readonly kind: 'action'
  readonly id: string
  readonly label: string
  readonly input: v.GenericSchema
  new (): Action<unknown, unknown>
}

export type CommandInput<H extends CommandHandle> = Parameters<InstanceType<H>['apply']>[1]

export type ActionInput<H extends ActionHandle> = Parameters<InstanceType<H>['apply']>[0]

export type ActionError<H extends ActionHandle> =
  ReturnType<InstanceType<H>['apply']> extends AsyncResult<void, infer E> ? E : never

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

export interface InputMismatch {
  readonly inputMismatch: "apply's input must be exactly v.InferOutput of the static input schema"
}

export type InputCheck<Input, Schema extends v.GenericSchema> =
  Same<Input, v.InferOutput<Schema>> extends true ? unknown : InputMismatch
