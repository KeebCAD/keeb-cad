import type { Frozen, Parameter, ParameterName, Rejection } from '@keeb-cad/schema'
import type * as v from 'valibot'

import type { startRenameParameterInputSchema } from './start-rename-parameter-input-schema'

export type StartRenameParameterInput = v.InferOutput<typeof startRenameParameterInputSchema>

export type UseFocusedParameterResult = {
  focus: (name: ParameterName) => void
  clear: () => void
}

export type UseDeleteParameterRefusalResult = {
  // The refusal's text while the parameter's row shows one.
  text: (name: string) => string | undefined
  clear: (name: string) => void
}

export interface HeldRefusal {
  readonly name: ParameterName
  readonly rejection: Rejection
}

export type ParameterRowProps = {
  parameter: Frozen<Parameter>
  // The row as text, `name = expression = value`, when a later parameter repeats a taken name (a
  // hand-edited file): every command acts on the first parameter of a name, so this one is shown,
  // never edited.
  readOnlyText?: string
}
