import * as v from 'valibot'

import { blueprintIdSchema } from './blueprint-id'
import { partIdSchema } from './part-id'

export const libraryIdSchema = v.union([partIdSchema, blueprintIdSchema])
