import { RenameParameter, type RenameParameterInput } from '@keeb-cad/commands'
import type { Component } from 'vue'

import type { Flow } from '../flows/types'
import RenameParameterView from './RenameParameterView.vue'

export class RenameParameterFlow implements Flow<RenameParameterInput> {
  static readonly kind = 'flow'
  static readonly finishesWith = RenameParameter
  // Typed as a component: the view's props name this class, which would otherwise be circular.
  static readonly view: Component = RenameParameterView
}
