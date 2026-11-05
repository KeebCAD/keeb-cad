import type { Container } from '@keeb-cad/di'
import type { Design } from '@keeb-cad/schema'
import * as v from 'valibot'
import { describe, expectTypeOf, it } from 'vitest'

import type { Writable } from '../patching/types'
import { registerCommand } from './register-command'
import type { Command, CommandHandle } from './types'

type NameInput = v.ObjectSchema<{ readonly name: v.StringSchema<undefined> }, undefined>

interface NameHandle<Input> {
  readonly kind: 'command'
  readonly id: string
  readonly label: string
  readonly input: NameInput
  new (): Command<Input>
}

class Rename implements Command<v.InferOutput<typeof Rename.input>> {
  static readonly kind = 'command'
  static readonly id = 'test.rename'
  static readonly label = 'Rename'
  static readonly input = v.object({ name: v.string() })

  available(): boolean {
    return true
  }

  apply(draft: Writable<Design>, input: v.InferOutput<typeof Rename.input>): void {
    draft.meta.name = input.name
  }
}

class Untitle implements Command<v.InferOutput<typeof Untitle.input>> {
  static readonly kind = 'command'
  static readonly id = 'test.untitle'
  static readonly label = 'Untitle'
  static readonly input = v.object({})

  available(): boolean {
    return true
  }

  apply(draft: Writable<Design>): void {
    draft.meta.name = 'Untitled'
  }
}

describe('registerCommand', () => {
  it('takes a handle class whose command id stays literal', () => {
    const register = (container: Container) => {
      registerCommand(container, Rename)
    }
    expectTypeOf(register).toBeFunction()
    expectTypeOf<typeof Rename>().toExtend<CommandHandle>()
    expectTypeOf<(typeof Rename)['id']>().toEqualTypeOf<'test.rename'>()
  })

  it('accepts an apply input that is exactly the schema output', () => {
    const register = (container: Container, exact: NameHandle<{ name: string }>) => {
      registerCommand(container, exact)
    }
    expectTypeOf(register).toBeFunction()
  })

  it('refuses an apply input narrower than the schema output', () => {
    const register = (
      container: Container,
      narrower: NameHandle<{ name: string; extra: string }>,
    ) => {
      // @ts-expect-error The schema does not produce `extra`.
      registerCommand(container, narrower)
    }
    expectTypeOf(register).toBeFunction()
  })

  it('refuses an apply input that disagrees with the schema output', () => {
    const register = (container: Container, disagrees: NameHandle<{ name: number }>) => {
      // @ts-expect-error The schema produces a string name, not a number.
      registerCommand(container, disagrees)
    }
    expectTypeOf(register).toBeFunction()
  })

  it('refuses an apply that omits its input', () => {
    const register = (container: Container) => {
      // @ts-expect-error An apply with no input parameter does not take the schema output.
      registerCommand(container, Untitle)
    }
    expectTypeOf(register).toBeFunction()
  })
})
