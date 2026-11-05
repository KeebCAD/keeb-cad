import { Result } from '@keeb-cad/result'
import type { DerivedFile, Emptied, MigratedBundle } from '@keeb-cad/schema'
import type * as v from 'valibot'

import { parse } from '../parsing/parse'

export function readDerivedFile<S extends v.GenericSchema>(
  schema: S,
  file: DerivedFile,
  bundle: MigratedBundle,
): Result<v.InferOutput<S>, Emptied> {
  if (bundle.unreadable.includes(file)) return Result.err({ file, reason: 'unreadable' })
  const value = bundle[file]
  return value === undefined
    ? Result.err({ file, reason: 'missing' })
    : parse(schema, value).mapErr((): Emptied => ({ file, reason: 'invalid' }))
}
