import type { Flow } from '../flows/types'
import { TestBrokenStoreName } from './test-broken-store-name'
import type { TestBrokenStoreNameInput } from './types'

export class TestBrokenStoreNameFlow implements Flow<TestBrokenStoreNameInput> {
  static readonly kind = 'flow'
  static readonly finishesWith = TestBrokenStoreName
}
