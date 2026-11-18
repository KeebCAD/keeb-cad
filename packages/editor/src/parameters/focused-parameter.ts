import { Option } from '@keeb-cad/result'
import type { ParameterName } from '@keeb-cad/schema'
import { shallowRef } from 'vue'

// The parameter whose name in the Parameters tab holds focus, which F2 and Delete act on.
export class FocusedParameter {
  get name(): Option<ParameterName> {
    return Option.fromNullable(this.#name.value)
  }

  focus(name: ParameterName): void {
    this.#name.value = name
  }

  clear(): void {
    this.#name.value = undefined
  }

  readonly #name = shallowRef<ParameterName | undefined>(undefined)
}
