import { type Id, idSchema } from '@keeb-cad/schema'
import { customAlphabet } from 'nanoid'
import * as v from 'valibot'

// Twelve characters from 36 give about 62 bits: uniqueness rests on randomness, with no set of
// taken ids.
const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz'
const length = 12

export function mintId(): Id {
  return v.parse(idSchema, customAlphabet(alphabet, length)())
}
