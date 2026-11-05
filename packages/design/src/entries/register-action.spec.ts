import type { AsyncResult } from '@keeb-cad/result'
import type * as v from 'valibot'
import { describe, expectTypeOf, it } from 'vitest'

import { registerAction } from './register-action'
import type { Action, InputMismatch } from './types'

type NameInput = v.ObjectSchema<{ readonly name: v.StringSchema<undefined> }, undefined>

interface NameHandle<Input> {
  readonly kind: 'action'
  readonly id: string
  readonly label: string
  readonly input: NameInput
  new (): Action<Input, never>
}

interface OmitsInputHandle {
  readonly kind: 'action'
  readonly id: string
  readonly label: string
  readonly input: v.ObjectSchema<Record<never, never>, undefined>
  new (): { available(): boolean; apply(): AsyncResult<void, never> }
}

describe('registerAction', () => {
  it('accepts an apply input that is exactly the schema output', () => {
    expectTypeOf(registerAction<NameHandle<{ name: string }>>)
      .parameter(1)
      .toEqualTypeOf<NameHandle<{ name: string }>>()
  })

  it('refuses an apply input narrower than the schema output', () => {
    expectTypeOf(registerAction<NameHandle<{ name: string; extra: string }>>)
      .parameter(1)
      .toEqualTypeOf<NameHandle<{ name: string; extra: string }> & InputMismatch>()
  })

  it('refuses an apply input that disagrees with the schema output', () => {
    expectTypeOf(registerAction<NameHandle<{ name: number }>>)
      .parameter(1)
      .toEqualTypeOf<NameHandle<{ name: number }> & InputMismatch>()
  })

  it('refuses an apply that omits its input', () => {
    expectTypeOf(registerAction<OmitsInputHandle>)
      .parameter(1)
      .toEqualTypeOf<OmitsInputHandle & InputMismatch>()
  })
})
