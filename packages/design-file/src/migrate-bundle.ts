import { Result } from '@keeb-cad/result'
import type { DerivedFile, LoadError, MigratedBundle } from '@keeb-cad/schema'

import { readDesignFile } from './design-file/read-design-file'
import { readFingerprintsFile } from './fingerprints-file/read-fingerprints-file'
import { readRoutingFile } from './routing-file/read-routing-file'
import type { RawBundle } from './types'

// Only the design file can refuse a bundle: a derived file that can't be read is listed as
// unreadable and passed on as absent.
export function migrateBundle(raw: RawBundle): Result<MigratedBundle, LoadError> {
  if (raw.design === undefined) {
    return Result.err({
      kind: 'file-unreadable',
      file: 'design',
      message: 'The bundle has no design file.',
    })
  }
  return readDesignFile(raw.design).map((design) => {
    const bundle: MigratedBundle = { design, unreadable: [] }
    const derived: [DerivedFile, (text: string) => Result<unknown, string>][] = [
      ['routing', readRoutingFile],
      ['fingerprints', readFingerprintsFile],
    ]
    for (const [file, read] of derived) {
      const text = raw[file]
      if (text === undefined) continue
      read(text).match({
        ok: (value) => {
          bundle[file] = value
        },
        err: () => {
          bundle.unreadable.push(file)
        },
      })
    }
    return bundle
  })
}
