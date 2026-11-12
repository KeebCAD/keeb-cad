import type { TextFieldProps } from '../../src/text-field/types'
import type { WidgetState } from './types'

export const textFieldStates: readonly WidgetState<TextFieldProps & { modelValue: string }>[] = [
  {
    name: 'empty with a placeholder',
    props: { label: 'Id', placeholder: 'generated if empty', modelValue: '' },
  },
  { name: 'with a value', props: { label: 'Id', modelValue: 'thumb' } },
  {
    name: 'with an error',
    props: { label: 'Id', error: 'An id is kebab-case.', modelValue: 'Foo Bar' },
  },
]
