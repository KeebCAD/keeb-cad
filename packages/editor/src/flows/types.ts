import type { ActionError, ActionHandle, CommandHandle } from '@keeb-cad/design'
import type { AsyncResult, Result } from '@keeb-cad/result'
import type { Rejection } from '@keeb-cad/schema'
import type * as v from 'valibot'
import type { Component, ComputedRef } from 'vue'

import type { ActionFailure } from '../rejection/types'

// A method rather than a function property, so a flow with a narrower input still fits
// `FlowHandle`; registerFlow checks the input itself.
export interface Flow<Input> {
  finished?(input: Input): void
}

export interface FlowHandle {
  readonly kind: 'flow'
  readonly finishesWith: CommandHandle | ActionHandle
  readonly view?: Component
  new (): Flow<unknown>
}

export type FlowDraft<H extends FlowHandle> = v.InferInput<H['finishesWith']['input']>

export interface FlowEntry<H extends FlowHandle = FlowHandle> {
  readonly id: number
  readonly handle: H
}

export interface OpenFlow {
  readonly entry: FlowEntry
  readonly draft: unknown
  readonly availability: Result<void, Rejection | ActionFailure>
}

export type CancelReason = 'cancel' | 'replaced' | 'design-replaced'

export type FlowEvent =
  | { readonly kind: 'started'; readonly entry: FlowEntry }
  | { readonly kind: 'finished'; readonly entry: FlowEntry }
  | { readonly kind: 'cancelled'; readonly entry: FlowEntry; readonly reason: CancelReason }

export type FlowsEvents = {
  flow: (event: FlowEvent) => void
}

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

export interface FlowInputMismatch {
  readonly flowInputMismatch: "finished's input must be exactly v.InferOutput of finishesWith's input schema"
}

export interface FlowFailureMismatch {
  readonly flowFailureMismatch: "finishesWith's action must fail only with an ActionFailure"
}

type FlowInputCheck<H extends FlowHandle> =
  InstanceType<H> extends { finished(input: infer Input): void }
    ? Same<Input, v.InferOutput<H['finishesWith']['input']>> extends true
      ? unknown
      : FlowInputMismatch
    : unknown

type FlowFailureCheck<H extends FlowHandle> = H['finishesWith'] extends ActionHandle
  ? [ActionError<H['finishesWith']>] extends [ActionFailure]
    ? unknown
    : FlowFailureMismatch
  : unknown

export type FlowCheck<H extends FlowHandle> = FlowInputCheck<H> & FlowFailureCheck<H>

export type FlowViewProps<H extends FlowHandle> = { entry: FlowEntry<H> }

export type UseOpenFlowResult<H extends FlowHandle> = {
  draft: ComputedRef<FlowDraft<H>>
  reason: ComputedRef<string | undefined>
  update: (draft: FlowDraft<H>) => void
  finish: () => AsyncResult<void, Rejection | ActionFailure>
  cancel: () => void
}

export type FlowHostView = { view: Component; entry: FlowEntry }
