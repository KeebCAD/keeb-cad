import type { DesignStore } from '@keeb-cad/design'
import type { LayoutScript } from '@keeb-cad/reference-designs/scripts'
import { expect } from 'vitest'

import type { RefusedStep } from './types'

// Runs each step on the open design; every step must be accepted.
export function runSteps(store: DesignStore, steps: LayoutScript): void {
  const refused = steps.flatMap(({ command, input }) =>
    store.runById(command, input).match<RefusedStep[]>({
      ok: () => [],
      err: (rejection) => [{ command, input, rejection }],
    }),
  )
  expect(refused).toEqual([])
}
