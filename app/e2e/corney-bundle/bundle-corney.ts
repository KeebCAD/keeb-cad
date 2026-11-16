import {
  designActionsModule,
  layoutCommandsModule,
  NewDesign,
  overridesCommandsModule,
  partsCommandsModule,
} from '@keeb-cad/commands'
import { DesignStore, designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { corneyIslandLayout } from '@keeb-cad/reference-designs/scripts'
import { InvariantError } from '@keeb-cad/result'
import { writeBundle } from '@keeb-cad/storage'

import type { CorneyBundle } from './types'

export async function bundleCorney(): Promise<CorneyBundle> {
  const container = new Container()
  for (const module of [
    designModule,
    designActionsModule,
    partsCommandsModule,
    layoutCommandsModule,
    overridesCommandsModule,
  ])
    container.addModule(module)
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  const created = await store.run(NewDesign, {})
  // NewDesign builds one fixed design its own spec proves valid.
  if (created.isErr()) throw new InvariantError("A new design failed to open for Corney's bundle.")
  for (const { command, input } of corneyIslandLayout) {
    const ran = store.runById(command, input)
    // The script runs on the design NewDesign just built, as app's Corney tests prove it does.
    if (ran.isErr()) {
      throw new InvariantError(`Corney's ${command} was rejected: ${ran.error.kind}.`)
    }
  }
  const current = store.current.getOrUndefined()
  if (current === undefined) throw new InvariantError("Corney's bundle has no open design.")
  const { design, revision } = current
  return {
    label: { id: design.meta.id, name: design.meta.name, revision },
    texts: writeBundle(current),
  }
}
