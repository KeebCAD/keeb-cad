import type { Result } from '@keeb-cad/result'
import type { Design, Rejection } from '@keeb-cad/schema'
import type * as v from 'valibot'
import { describe, expectTypeOf, it } from 'vitest'

import type { Writable } from '../patching/types'
import { registerCommand } from './register-command'
import type { Command, CommandHandle, InputMismatch } from './types'

type NameInput = v.ObjectSchema<{ readonly name: v.StringSchema<undefined> }, undefined>

interface NameHandle<Input> {
  readonly kind: 'command'
  readonly id: string
  readonly label: string
  readonly input: NameInput
  new (): Command<Input>
}

interface OmitsInputHandle {
  readonly kind: 'command'
  readonly id: string
  readonly label: string
  readonly input: v.ObjectSchema<Record<never, never>, undefined>
  new (): { available(): Result<void, Rejection>; apply(draft: Writable<Design>): void }
}

interface HotkeysHandle<Hotkeys> {
  readonly kind: 'command'
  readonly id: string
  readonly label: string
  readonly input: NameInput
  readonly hotkeys: Hotkeys
  new (): Command<{ name: string }>
}

describe('registerCommand', () => {
  it('accepts an apply input that is exactly the schema output', () => {
    expectTypeOf(registerCommand<NameHandle<{ name: string }>>)
      .parameter(1)
      .toEqualTypeOf<NameHandle<{ name: string }>>()
  })

  it('refuses an apply input narrower than the schema output', () => {
    expectTypeOf(registerCommand<NameHandle<{ name: string; extra: string }>>)
      .parameter(1)
      .toEqualTypeOf<NameHandle<{ name: string; extra: string }> & InputMismatch>()
  })

  it('refuses an apply input that disagrees with the schema output', () => {
    expectTypeOf(registerCommand<NameHandle<{ name: number }>>)
      .parameter(1)
      .toEqualTypeOf<NameHandle<{ name: number }> & InputMismatch>()
  })

  it('refuses an apply that omits its input', () => {
    expectTypeOf(registerCommand<OmitsInputHandle>)
      .parameter(1)
      .toEqualTypeOf<OmitsInputHandle & InputMismatch>()
  })

  it('registers a handle that declares its hotkeys as a list', () => {
    expectTypeOf(registerCommand<HotkeysHandle<readonly ['A']>>)
      .parameter(1)
      .toEqualTypeOf<HotkeysHandle<readonly ['A']>>()
  })

  it('does not take a handle with a bare-string hotkey as a CommandHandle', () => {
    expectTypeOf<HotkeysHandle<'A'>>().not.toExtend<CommandHandle>()
  })
})
