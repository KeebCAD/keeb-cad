import * as v from 'valibot'

import { formSchema } from './form'
import { gapSchema } from './gap'
import { idSchema } from './id'
import { partRefSchema } from './part-ref'

export const metaSchema = v.strictObject({
  id: idSchema,
  name: v.string(),
  form: formSchema,
  defaultPart: partRefSchema,
  gap: gapSchema,
})
