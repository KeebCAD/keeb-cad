import type { Action } from '@keeb-cad/design'
import { AsyncResult } from '@keeb-cad/result'

import { testStoreNameInputSchema } from './test-store-name-input-schema'
import type { TestStoreNameFailure, TestStoreNameInput } from './types'

// Always fails as a full browser storage would.
export class TestStoreName implements Action<TestStoreNameInput, TestStoreNameFailure> {
  static readonly kind = 'action'
  static readonly id = 'testing.storeName'
  static readonly label = 'Store name'
  static readonly input = testStoreNameInputSchema

  available(): boolean {
    return true
  }

  apply(_input: TestStoreNameInput): AsyncResult<void, TestStoreNameFailure> {
    return AsyncResult.err({ kind: 'quota-exceeded' })
  }
}
