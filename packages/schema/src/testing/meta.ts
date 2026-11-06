import type { Meta } from '../types'
import { aSplitForm } from './form'
import { anId } from './id'

export function aMeta({
  id = anId('corne'),
  name = 'Corne',
  form = aSplitForm(),
}: Partial<Meta> = {}): Meta {
  return { id, name, form }
}
