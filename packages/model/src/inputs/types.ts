import type { Id, InputValue, OptionInput, PlainInput } from '@keeb-cad/schema'

export interface InputOwner {
  scope: 'part' | 'slot'
  id: Id
}

export type CheckedInput = OptionInput | PlainInput

export type BlueprintInputInvalid = { owner: InputOwner; input: string } & (
  | { reason: 'unknown' }
  | { reason: 'not-per-slot' }
  | { reason: 'bad-value'; value: InputValue; expected: CheckedInput }
)
