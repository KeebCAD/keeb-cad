import type { Action } from '@keeb-cad/design'
import type { AsyncResult } from '@keeb-cad/result'

import { testBrokenStoreNameInputSchema } from './test-broken-store-name-input-schema'
import type { TestBrokenStoreNameInput } from './types'

// A bug in an action: its apply throws instead of answering.
export class TestBrokenStoreName implements Action<TestBrokenStoreNameInput, never> {
  static readonly kind = 'action'
  static readonly id = 'testing.brokenStoreName'
  static readonly label = 'Broken store name'
  static readonly input = testBrokenStoreNameInputSchema

  available(): boolean {
    return true
  }

  apply(_input: TestBrokenStoreNameInput): AsyncResult<void, never> {
    throw new Error('TestBrokenStoreName broke.')
  }
}
