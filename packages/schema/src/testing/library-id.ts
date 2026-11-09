import * as v from 'valibot'

import { libraryIdSchema } from '../library-id'
import type { LibraryId } from '../types'

export function aLibraryId(text = 'lib:blueprint/choc-key'): LibraryId {
  return v.parse(libraryIdSchema, text)
}
