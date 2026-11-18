import { DeleteParameter } from '@keeb-cad/commands'
import { inject } from '@keeb-cad/di'
import { Option } from '@keeb-cad/result'
import type { Rejection } from '@keeb-cad/schema'
import * as v from 'valibot'
import { shallowRef } from 'vue'

import { Invoke } from '../invoke/invoke'
import type { InvokeEvent } from '../invoke/types'
import type { HeldRefusal } from './types'

// The latest refused delete of a parameter, shown under its row until focus leaves the row.
export class DeleteParameterRefusal implements Disposable {
  refusal(name: string): Option<Rejection> {
    const held = this.#held.value
    return held?.name === name ? Option.some(held.rejection) : Option.none()
  }

  clear(name: string): void {
    if (this.#held.value?.name === name) this.#held.value = undefined
  }

  [Symbol.dispose](): void {
    this.#stopListening()
  }

  readonly #invoke = inject(Invoke)
  readonly #held = shallowRef<HeldRefusal | undefined>(undefined)
  readonly #stopListening = this.#invoke.events.on('invoke', (event) => {
    this.#settled(event)
  })

  #settled({ id, input, result }: InvokeEvent): void {
    if (id !== DeleteParameter.id) return
    const parsed = v.safeParse(DeleteParameter.input, input)
    if (!parsed.success) return
    const { name } = parsed.output
    // A command's invocation fails only with a Rejection.
    if (result.isErr()) this.#held.value = { name, rejection: result.error as Rejection }
    else this.clear(name)
  }
}
