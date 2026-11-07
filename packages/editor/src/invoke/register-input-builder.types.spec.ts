import type { ActionHandle } from '@keeb-cad/design'
import type * as v from 'valibot'
import { describe, expectTypeOf, it } from 'vitest'

import { registerInputBuilder } from './register-input-builder'
import type { BuilderInputMismatch, InputBuilder } from './types'

interface DefaultedHandle extends ActionHandle {
  readonly input: v.OptionalSchema<v.StringSchema<undefined>, 'x'>
}

type Builder<Input> = new () => InputBuilder<Input>

describe('registerInputBuilder', () => {
  it("accepts a builder whose input is exactly the schema's input", () => {
    expectTypeOf(registerInputBuilder<DefaultedHandle, Builder<string | undefined>>)
      .parameter(2)
      .toEqualTypeOf<Builder<string | undefined>>()
  })

  it("refuses a builder whose input is the schema's output, not its input", () => {
    expectTypeOf(registerInputBuilder<DefaultedHandle, Builder<string>>)
      .parameter(2)
      .toEqualTypeOf<Builder<string> & BuilderInputMismatch>()
  })
})
