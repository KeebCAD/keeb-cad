import type { Container } from '@keeb-cad/di'
import { AsyncResult } from '@keeb-cad/result'
import * as v from 'valibot'
import { describe, expectTypeOf, it } from 'vitest'

import { registerAction } from './register-action'
import type { Action } from './types'

type NameInput = v.ObjectSchema<{ readonly name: v.StringSchema<undefined> }, undefined>

interface NameHandle<Input> {
  readonly kind: 'action'
  readonly id: string
  readonly label: string
  readonly input: NameInput
  new (): Action<Input, never>
}

class Reset implements Action<v.InferOutput<typeof Reset.input>, never> {
  static readonly kind = 'action'
  static readonly id = 'test.reset'
  static readonly label = 'Reset'
  static readonly input = v.object({})

  available(): boolean {
    return true
  }

  apply(): AsyncResult<void, never> {
    return AsyncResult.ok()
  }
}

describe('registerAction', () => {
  it('accepts an apply input that is exactly the schema output', () => {
    const register = (container: Container, exact: NameHandle<{ name: string }>) => {
      registerAction(container, exact)
    }
    expectTypeOf(register).toBeFunction()
  })

  it('refuses an apply input narrower than the schema output', () => {
    const register = (
      container: Container,
      narrower: NameHandle<{ name: string; extra: string }>,
    ) => {
      // @ts-expect-error The schema does not produce `extra`.
      registerAction(container, narrower)
    }
    expectTypeOf(register).toBeFunction()
  })

  it('refuses an apply input that disagrees with the schema output', () => {
    const register = (container: Container, disagrees: NameHandle<{ name: number }>) => {
      // @ts-expect-error The schema produces a string name, not a number.
      registerAction(container, disagrees)
    }
    expectTypeOf(register).toBeFunction()
  })

  it('refuses an apply that omits its input', () => {
    const register = (container: Container) => {
      // @ts-expect-error An apply with no input parameter does not take the schema output.
      registerAction(container, Reset)
    }
    expectTypeOf(register).toBeFunction()
  })
})
