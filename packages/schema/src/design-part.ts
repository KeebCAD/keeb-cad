import * as v from 'valibot'

import { idSchema } from './id'
import { blueprintInputsSchema } from './input-value'
import { ref } from './ref'

export const blueprintDesignPartSchema = v.pipe(
  v.strictObject({
    type: v.literal('blueprint'),
    id: idSchema,
    blueprint: ref('library-blueprint'),
    inputs: blueprintInputsSchema,
  }),
  v.metadata({ node: 'part' }),
)

export const authoredDesignPartSchema = v.pipe(
  v.strictObject({ type: v.literal('authored'), id: idSchema }),
  v.metadata({ node: 'part' }),
)

export const designPartSchema = v.variant('type', [
  blueprintDesignPartSchema,
  authoredDesignPartSchema,
])
