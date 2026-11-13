import * as v from 'valibot'

import { blueprintIdSchema } from './blueprint-id'
import { idSchema } from './id'
import { partIdSchema } from './part-id'
import type { RefSchema } from './types'

const targets = {
  'library-part': partIdSchema,
  'library-blueprint': blueprintIdSchema,
  'design-part': idSchema,
  slot: idSchema,
  group: idSchema,
} as const

export function ref(kind: 'library-part'): RefSchema<typeof partIdSchema>
export function ref(kind: 'library-blueprint'): RefSchema<typeof blueprintIdSchema>
export function ref(kind: 'design-part' | 'slot' | 'group'): RefSchema<typeof idSchema>
export function ref(kind: keyof typeof targets): v.GenericSchema<string, string> {
  return v.pipe(targets[kind] as v.GenericSchema<string, string>, v.metadata({ refKind: kind }))
}
