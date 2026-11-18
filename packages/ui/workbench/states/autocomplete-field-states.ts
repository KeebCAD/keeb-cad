import type { AutocompleteFieldProps } from '../../src/autocomplete-field/types'
import type { WidgetState } from './types'

const OPTIONS = [
  { value: 'wall', label: 'wall = 2 mm' },
  { value: 'wide', label: 'wide ≈ 2.37 mm' },
]

export const autocompleteFieldStates: readonly WidgetState<
  AutocompleteFieldProps & { modelValue: string; open?: boolean }
>[] = [
  {
    name: 'empty with a placeholder',
    props: { label: 'gap x', placeholder: 'mixed', options: [], modelValue: '' },
  },
  { name: 'a plain literal', props: { label: 'gap x', options: [], modelValue: '1mm' } },
  {
    name: 'an expression with its value',
    props: {
      label: 'gap x',
      suffix: '= 5.37 mm',
      options: [],
      modelValue: 'stagger + 0.37mm',
    },
  },
  {
    name: 'with an error',
    props: {
      label: 'gap x',
      error: 'Not a quantity in mm.',
      options: [],
      modelValue: '5deg',
    },
  },
  {
    name: 'with its label hidden',
    props: { label: 'gap x', labelHidden: true, options: [], modelValue: '3mm' },
  },
  {
    name: 'with its list open',
    props: { label: 'gap x', options: OPTIONS, open: true, modelValue: 'w' },
  },
  {
    name: 'with its list open over an error',
    props: {
      label: 'gap x',
      error: 'No parameter is named "w".',
      options: OPTIONS,
      open: true,
      modelValue: 'w',
    },
  },
]
