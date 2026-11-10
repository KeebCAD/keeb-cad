import type { Meta } from '../types'
import { aSplitForm } from './form'
import { aGap } from './gap'
import { anId } from './id'
import { aPartRef } from './part-ref'

export function aMeta({
  id = anId('corne'),
  name = 'Corne',
  form = aSplitForm(),
  defaultPart = aPartRef(),
  gap = aGap(),
}: Partial<Meta> = {}): Meta {
  return { id, name, form, defaultPart, gap }
}
