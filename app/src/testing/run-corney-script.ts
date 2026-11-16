import { NewDesign } from '@keeb-cad/commands'
import type { DesignStore } from '@keeb-cad/design'
import { corneyIslandLayout, type LayoutScript } from '@keeb-cad/reference-designs/scripts'
import { expectOk } from '@keeb-cad/result/testing'

import { runSteps } from './run-steps'

// A new design, Corney's script, then any test-only steps after it; every step must be accepted.
export async function runCorneyScript(store: DesignStore, steps: LayoutScript = []): Promise<void> {
  expectOk(await store.run(NewDesign, {}))
  runSteps(store, [...corneyIslandLayout, ...steps])
}
