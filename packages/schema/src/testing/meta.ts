import * as v from 'valibot'

import { idSchema } from '../id'
import type { Meta } from '../types'
import { aSplitForm } from './form'

export function aMeta({
  id = v.parse(idSchema, 'corne'),
  name = 'Corne',
  form = aSplitForm(),
}: Partial<Meta> = {}): Meta {
  return { id, name, form }
}
