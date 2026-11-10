import { fileURLToPath } from 'node:url'

import { corneyIslandLayout } from '../../reference-designs/src/scripts/corney-island-layout.ts'
import { filesContaining } from './files-containing.ts'

// The slot ids only the script holds; its group id `outer` is a common word a build may hold anyway.
export function referenceDesignsProblems(): string[] {
  const dist = fileURLToPath(new URL('../../app/dist', import.meta.url))
  const slotIds = corneyIslandLayout.flatMap(({ command, input }) =>
    command === 'layout.addSlot' ? [(input as { id: string }).id] : [],
  )
  return slotIds.flatMap((id) =>
    filesContaining(dist, id).map(
      (file) => `Reference design script in the production build (${id}): ${file}`,
    ),
  )
}
