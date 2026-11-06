import { describe, expectTypeOf, it } from 'vitest'

import { AsyncResult } from './async-result'
import type { Err } from './err'
import type { Ok } from './ok'

describe('AsyncResult', () => {
  describe('thenable contract', () => {
    it('is awaitable and yields the inner Result', async () => {
      const r = await AsyncResult.ok(1)
      expectTypeOf(r).toEqualTypeOf<Ok<number, never> | Err<number, never>>()
    })
  })
})
