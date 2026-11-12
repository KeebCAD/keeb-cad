import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-vue'

import { textFieldStates } from '../../workbench/states/text-field-states'
import type { TextFieldProps } from './types'
import UiTextField from './UiTextField.vue'

const LABEL = 'Id'
const ERROR = 'An id is kebab-case.'
const PLACEHOLDER = 'generated if empty'

async function arrange(props: TextFieldProps) {
  const screen = await render(UiTextField, { props })
  return { screen, field: () => screen.getByRole('textbox', { name: props.label }) }
}

describe('TextField', () => {
  it.each(textFieldStates)(
    'renders the $name state as a textbox named by its label',
    async (state) => {
      const screen = await render(UiTextField, { props: state.props })

      await expect
        .element(screen.getByRole('textbox', { name: LABEL }))
        .toHaveValue(state.props.modelValue)
    },
  )

  it('with an error is invalid and described by the error', async () => {
    const { field } = await arrange({ label: LABEL, error: ERROR })

    await expect.element(field()).toHaveAttribute('aria-invalid', 'true')
    await expect.element(field()).toHaveAccessibleDescription(ERROR)
  })

  it('with no error is not invalid and has no description', async () => {
    const { field } = await arrange({ label: LABEL })

    await expect.element(field()).not.toHaveAttribute('aria-invalid')
    await expect.element(field()).toHaveAccessibleDescription('')
  })

  it('shows its placeholder', async () => {
    const { field } = await arrange({ label: LABEL, placeholder: PLACEHOLDER })

    await expect.element(field()).toHaveAttribute('placeholder', PLACEHOLDER)
  })

  it('emits each keystroke as the new value', async () => {
    const { screen, field } = await arrange({ label: LABEL })

    await userEvent.type(field(), 'ab')

    expect(screen.emitted('update:modelValue')).toEqual([['a'], ['ab']])
  })
})
