import type { AsyncResult, Result } from '@keeb-cad/result'
import type { DesignInvalid, Rejection } from '@keeb-cad/schema'
import type * as v from 'valibot'
import { describe, expectTypeOf, it } from 'vitest'

import type { Action, Command } from '../entries/types'
import type { DesignStore } from './design-store'

type NameInput = v.ObjectSchema<{ readonly name: v.StringSchema<undefined> }, undefined>

interface RenameHandle {
  readonly kind: 'command'
  readonly id: 'test.rename'
  readonly label: string
  readonly input: NameInput
  new (): Command<{ name: string }>
}

interface LoadHandle {
  readonly kind: 'action'
  readonly id: 'test.load'
  readonly label: string
  readonly input: NameInput
  new (): Action<{ name: string }, DesignInvalid>
}

describe('DesignStore.run', () => {
  it('refuses a command input of the wrong type', () => {
    const run = (store: DesignStore, rename: RenameHandle) => {
      // @ts-expect-error The schema takes a string name.
      store.run(rename, { name: 1 })
    }
    expectTypeOf(run).toBeFunction()
  })

  it('refuses an action input of the wrong type', () => {
    const run = (store: DesignStore, load: LoadHandle) => {
      // @ts-expect-error The schema takes a string name.
      void store.run(load, { name: 1 })
    }
    expectTypeOf(run).toBeFunction()
  })

  it('returns a command result refused only with a rejection', () => {
    const run = (store: DesignStore, rename: RenameHandle) => store.run(rename, { name: 'Corne' })
    expectTypeOf(run).returns.toEqualTypeOf<Result<void, Rejection>>()
  })

  it("returns an action's own error alongside a rejection", () => {
    const run = (store: DesignStore, load: LoadHandle) => store.run(load, { name: 'Corne' })
    expectTypeOf(run).returns.toEqualTypeOf<AsyncResult<void, DesignInvalid | Rejection>>()
  })
})
