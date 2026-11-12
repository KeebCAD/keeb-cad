import type { Flow } from '../flows/types'
import { TestStoreName } from './test-store-name'
import type { TestStoreNameInput } from './types'

export class TestStoreNameFlow implements Flow<TestStoreNameInput> {
  static readonly kind = 'flow'
  static readonly finishesWith = TestStoreName
}
