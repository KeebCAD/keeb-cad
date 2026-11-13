import * as v from 'valibot'
import { match } from 'ts-pattern'

import type { CheckedInput } from './types'

export function inputValueSchema(declared: CheckedInput): v.GenericSchema<unknown> {
  return match(declared)
    .with({ kind: 'option' }, ({ options }) => v.picklist(options))
    .with({ kind: 'boolean' }, () => v.boolean())
    .with({ kind: 'text' }, () => v.string())
    .exhaustive()
}
