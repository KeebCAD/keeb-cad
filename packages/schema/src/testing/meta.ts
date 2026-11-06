import * as v from 'valibot'

import { idSchema } from '../id'
import type { Meta } from '../types'
import { aForm } from './form'

export function aMeta({
  id = v.parse(idSchema, 'corne'),
  name = 'Corne',
  form = aForm(),
}: Partial<Meta> = {}): Meta {
  return { id, name, form }
}
