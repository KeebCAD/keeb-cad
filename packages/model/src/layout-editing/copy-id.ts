import { type Id, idSchema } from '@keeb-cad/schema'
import * as v from 'valibot'

const NUMBERED = /-\d+$/
const FIRST_COPY = 2

// The lowest free `-N` from 2 on the id with any `-N` ending stripped, since a chosen id and a
// copy's id can't be told apart.
export function copyId(id: Id, taken: ReadonlySet<string>): Id {
  const base = id.replace(NUMBERED, '')
  let number = FIRST_COPY
  while (taken.has(`${base}-${number}`)) number += 1
  return v.parse(idSchema, `${base}-${number}`)
}
