import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-vue'

import { segmentedControlStates } from '../../workbench/states/segmented-control-states'
import UiSegmentedControl from './UiSegmentedControl.vue'

const AXES = [
  { value: 'y', label: 'Column ↑' },
  { value: 'x', label: 'Row →' },
] as const

async function arrange(modelValue: string) {
  const screen = await render(UiSegmentedControl, {
    props: { label: 'Axis', options: AXES, modelValue },
  })
  return {
    screen,
    group: () => screen.getByRole('radiogroup', { name: 'Axis' }),
    radio: (name: string) => screen.getByRole('radio', { name }),
  }
}

describe('SegmentedControl', () => {
  it.each(segmentedControlStates)(
    'renders the $name state as a radio group named by its label',
    async (state) => {
      const screen = await render(UiSegmentedControl, { props: state.props })

      await expect
        .element(screen.getByRole('radiogroup', { name: state.props.label }))
        .toBeVisible()
    },
  )

  it('checks the option holding its value and no other', async () => {
    const { group, radio } = await arrange('y')

    await expect.element(group()).toBeVisible()
    await expect.element(radio('Column ↑')).toHaveAttribute('aria-checked', 'true')
    await expect.element(radio('Row →')).toHaveAttribute('aria-checked', 'false')
  })

  it('emits the value of a pressed option', async () => {
    const { screen, radio } = await arrange('y')

    await radio('Row →').click()

    expect(screen.emitted('update:modelValue')).toEqual([['x']])
  })

  it('emits nothing for a press on the checked option', async () => {
    const { screen, radio } = await arrange('y')

    await radio('Column ↑').click()

    expect(screen.emitted('update:modelValue')).toBeUndefined()
  })
})
