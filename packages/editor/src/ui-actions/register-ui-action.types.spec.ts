import type { InputMismatch } from '@keeb-cad/design'
import type * as v from 'valibot'
import { describe, expectTypeOf, it } from 'vitest'

import { registerUiAction } from './register-ui-action'
import type { UiAction } from './types'

type NameInput = v.ObjectSchema<{ readonly name: v.StringSchema<undefined> }, undefined>

interface NameHandle<Input> {
  readonly kind: 'ui-action'
  readonly id: string
  readonly label: string
  readonly input: NameInput
  new (): UiAction<Input>
}

describe('registerUiAction', () => {
  it('accepts an apply input that is exactly the schema output', () => {
    expectTypeOf(registerUiAction<NameHandle<{ name: string }>>)
      .parameter(1)
      .toEqualTypeOf<NameHandle<{ name: string }>>()
  })

  it('refuses an apply input narrower than the schema output', () => {
    expectTypeOf(registerUiAction<NameHandle<{ name: string; extra: string }>>)
      .parameter(1)
      .toEqualTypeOf<NameHandle<{ name: string; extra: string }> & InputMismatch>()
  })

  it('refuses an apply input that disagrees with the schema output', () => {
    expectTypeOf(registerUiAction<NameHandle<{ name: number }>>)
      .parameter(1)
      .toEqualTypeOf<NameHandle<{ name: number }> & InputMismatch>()
  })
})
