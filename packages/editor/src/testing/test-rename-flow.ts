import type { Component } from 'vue'

import type { Flow } from '../flows/types'
import { TestRenameDesign } from './test-rename-design'
import TestRenameView from './TestRenameView.vue'
import type { TestRenameDesignInput } from './types'

export class TestRenameFlow implements Flow<TestRenameDesignInput> {
  static readonly kind = 'flow'
  static readonly finishesWith = TestRenameDesign
  // Typed as a component: the view's props name this class, which would otherwise be circular.
  static readonly view: Component = TestRenameView
}
