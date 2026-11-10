import { NewDesign } from '@keeb-cad/commands'
import { DesignStore } from '@keeb-cad/design'
import { inject } from '@keeb-cad/di'
import { corneyIslandLayout } from '@keeb-cad/reference-designs/scripts'
import { InvariantError } from '@keeb-cad/result'

import type { DevSeed } from '../launch/types'

export class CorneySeed implements DevSeed {
  requested(): boolean {
    return new URLSearchParams(location.search).get('seed') === 'corney'
  }

  async open(): Promise<void> {
    const created = await this.#store.run(NewDesign, {})
    // NewDesign builds one fixed design its own spec proves valid.
    if (created.isErr())
      throw new InvariantError('A new design failed to open for the Corney seed.')
    for (const { command, input } of corneyIslandLayout) {
      const ran = this.#store.runById(command, input)
      // The script runs on the design NewDesign just built, as app's Corney tests prove it does.
      if (ran.isErr()) {
        throw new InvariantError(`The Corney seed's ${command} was rejected: ${ran.error.kind}.`)
      }
    }
  }

  readonly #store = inject(DesignStore)
}
