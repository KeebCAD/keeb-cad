import type { RunOptions } from '@keeb-cad/design'
import type { AsyncResult } from '@keeb-cad/result'
import type { Rejection, Unit } from '@keeb-cad/schema'
import type * as v from 'valibot'

export interface UseFieldSessionResult {
  begin: () => void
  end: () => void
  key: () => string | undefined
}

export interface ParameterValue {
  value: number
  unit?: Unit
}

export type ExpressionFieldProps = {
  label: string
  // The label names the input for screen readers only.
  labelHidden?: boolean
  // The authored expression the design holds.
  expression: string
  // The field's value schema, whose metadata says what it evaluates to.
  schema: v.GenericSchema
  // Shown while the field is empty.
  placeholder?: string
  run: (expression: string, options: RunOptions) => AsyncResult<void, Rejection>
}
