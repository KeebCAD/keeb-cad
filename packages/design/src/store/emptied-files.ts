import {
  type Emptied,
  fingerprintsFileSchema,
  type MigratedBundle,
  routingFileSchema,
} from '@keeb-cad/schema'

import { readDerivedFile } from './read-derived-file'

// The derived files replaceDesign would fill empty, asked before it runs.
export function emptiedFiles(bundle: MigratedBundle): Emptied[] {
  return [
    readDerivedFile(routingFileSchema, 'routing', bundle),
    readDerivedFile(fingerprintsFileSchema, 'fingerprints', bundle),
  ].flatMap((read) => read.match({ ok: (): Emptied[] => [], err: (emptied) => [emptied] }))
}
