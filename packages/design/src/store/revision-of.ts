import { hash } from '@keeb-cad/hashing'
import { type Design, type Frozen, type Revision, revisionSchema } from '@keeb-cad/schema'
import * as v from 'valibot'

export function revisionOf(design: Frozen<Design>): Revision {
  return v.parse(revisionSchema, hash(design))
}
