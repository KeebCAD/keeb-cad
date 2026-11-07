import type { AsyncResult } from '@keeb-cad/result'
import { describe, expectTypeOf, it } from 'vitest'

import type { DesignStorage } from './design-storage'
import type { SaveError } from './types'

describe('DesignStorage types', () => {
  it("gives save's error no not-found", () => {
    expectTypeOf<ReturnType<DesignStorage['save']>>().toEqualTypeOf<AsyncResult<void, SaveError>>()
    expectTypeOf<Extract<SaveError, { kind: 'not-found' }>>().toBeNever()
  })
})
