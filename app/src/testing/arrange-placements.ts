import { blueprintWorkerModule, LaneRunner } from '@keeb-cad/blueprint/worker'
import type { Committed } from '@keeb-cad/design'
import { DesignMirror, DesignMirrorWriter, designWorkerModule } from '@keeb-cad/design/worker'
import type { Container } from '@keeb-cad/di'
import { libraryData } from '@keeb-cad/library/worker'
import { createDerivations, type Derivations } from '@keeb-cad/model/worker'

// The model worker's parts lane and placements, wired by hand on the given container's mirror,
// which each call feeds a committed design.
export async function arrangePlacements(
  container: Container,
): Promise<(committed: Committed) => Promise<Derivations>> {
  container.addModule(designWorkerModule).addModule(blueprintWorkerModule)
  await container.autoLoad()
  const runner = container.resolve(LaneRunner)
  runner.useLibrary(libraryData)
  const derivations = createDerivations(container.resolve(DesignMirror), libraryData, runner)
  const writer = container.resolve(DesignMirrorWriter)
  return async ({ design, revision }) => {
    writer.replace(design, revision)
    await runner.pause(derivations.pins.value)
    return derivations
  }
}
