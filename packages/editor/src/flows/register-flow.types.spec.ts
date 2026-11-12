import type { Action, Command } from '@keeb-cad/design'
import type { StorageError } from '@keeb-cad/schema'
import type * as v from 'valibot'
import { describe, expectTypeOf, it } from 'vitest'

import { registerFlow } from './register-flow'
import type { Flow, FlowFailureMismatch, FlowInputMismatch } from './types'

type NameInput = v.ObjectSchema<{ readonly name: v.StringSchema<undefined> }, undefined>

interface NameCommand {
  readonly kind: 'command'
  readonly id: string
  readonly label: string
  readonly input: NameInput
  new (): Command<{ name: string }>
}

interface NameAction<E> {
  readonly kind: 'action'
  readonly id: string
  readonly label: string
  readonly input: NameInput
  new (): Action<{ name: string }, E>
}

interface FinishedFlow<Input> {
  readonly kind: 'flow'
  readonly finishesWith: NameCommand
  new (): Required<Flow<Input>>
}

interface PlainFlow {
  readonly kind: 'flow'
  readonly finishesWith: NameCommand
  new (): Flow<never>
}

interface ActionFlow<E> {
  readonly kind: 'flow'
  readonly finishesWith: NameAction<E>
  new (): Flow<never>
}

describe('registerFlow', () => {
  it("accepts a finished whose input is exactly finishesWith's schema output", () => {
    expectTypeOf(registerFlow<FinishedFlow<{ name: string }>>)
      .parameter(1)
      .toEqualTypeOf<FinishedFlow<{ name: string }>>()
  })

  it('accepts a flow with no finished', () => {
    expectTypeOf(registerFlow<PlainFlow>)
      .parameter(1)
      .toEqualTypeOf<PlainFlow>()
  })

  it("refuses a finished whose input disagrees with finishesWith's schema output", () => {
    expectTypeOf(registerFlow<FinishedFlow<{ name: number }>>)
      .parameter(1)
      .toEqualTypeOf<FinishedFlow<{ name: number }> & FlowInputMismatch>()
  })

  it("refuses a finished whose input is narrower than finishesWith's schema output", () => {
    expectTypeOf(registerFlow<FinishedFlow<{ name: string; extra: string }>>)
      .parameter(1)
      .toEqualTypeOf<FinishedFlow<{ name: string; extra: string }> & FlowInputMismatch>()
  })

  it('refuses an action that fails with something other than an ActionFailure', () => {
    expectTypeOf(registerFlow<ActionFlow<{ kind: 'other' }>>)
      .parameter(1)
      .toEqualTypeOf<ActionFlow<{ kind: 'other' }> & FlowFailureMismatch>()
  })

  it('accepts an action that never fails', () => {
    expectTypeOf(registerFlow<ActionFlow<never>>)
      .parameter(1)
      .toEqualTypeOf<ActionFlow<never>>()
  })

  it('accepts an action that fails with a StorageError', () => {
    expectTypeOf(registerFlow<ActionFlow<StorageError>>)
      .parameter(1)
      .toEqualTypeOf<ActionFlow<StorageError>>()
  })
})
