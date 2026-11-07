import type { AsyncResult } from '@keeb-cad/result'
import type * as v from 'valibot'
import { describe, expectTypeOf, it } from 'vitest'

import { registerAction } from './register-action'
import type { Action, ActionHandle, InputMismatch } from './types'

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

interface HotkeysHandle<Hotkeys> {
  readonly kind: 'action'
  readonly id: string
  readonly label: string
  readonly input: NameInput
  readonly hotkeys: Hotkeys
  new (): Action<{ name: string }, never>
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

  it('registers a handle that declares its hotkeys as a list', () => {
    expectTypeOf(registerAction<HotkeysHandle<readonly ['A']>>)
      .parameter(1)
      .toEqualTypeOf<HotkeysHandle<readonly ['A']>>()
  })

  it('does not take a handle with a bare-string hotkey as a ActionHandle', () => {
    expectTypeOf<HotkeysHandle<'A'>>().not.toExtend<ActionHandle>()
  })
})
