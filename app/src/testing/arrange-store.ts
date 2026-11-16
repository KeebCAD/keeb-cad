import { DesignStore } from '@keeb-cad/design'
import type { Container } from '@keeb-cad/di'
import { MemoryBackend, storageBackend } from '@keeb-cad/storage/testing'

import { mainModules } from '../main-modules'

// Main's modules on the given container, storing in memory.
export async function arrangeStore(container: Container): Promise<DesignStore> {
  for (const module of mainModules) container.addModule(module)
  container.override(storageBackend).useValue(new MemoryBackend())
  await container.autoLoad()
  return container.resolve(DesignStore)
}
