import * as v from 'valibot'

import { formSchema } from './form'
import { idSchema } from './id'

export const metaSchema = v.object({
  id: idSchema,
  name: v.string(),
  form: formSchema,
})
