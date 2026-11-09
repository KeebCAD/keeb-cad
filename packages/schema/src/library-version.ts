import * as v from 'valibot'

import { libraryIdSchema } from './library-id'
import { versionSchema } from './version'

export const libraryVersionSchema = v.pipe(
  v.strictObject({ id: libraryIdSchema, version: versionSchema }),
  v.metadata({ node: 'library-version' }),
)
