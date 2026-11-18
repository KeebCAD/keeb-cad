import { AddParameter, type AddParameterInput } from '@keeb-cad/commands'
import type { Component } from 'vue'

import type { Flow } from '../flows/types'
import AddParameterView from './AddParameterView.vue'

export class AddParameterFlow implements Flow<AddParameterInput> {
  static readonly kind = 'flow'
  static readonly finishesWith = AddParameter
  // Typed as a component: the view's props name this class, which would otherwise be circular.
  static readonly view: Component = AddParameterView
}
