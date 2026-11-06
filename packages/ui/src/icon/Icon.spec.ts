import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-vue'

import { iconStates } from '../../workbench/states/icon-states'
import UiIcon from './UiIcon.vue'

const EXPECTED_SIZE = '16'

function iconState(name: string) {
  const state = iconStates.find((candidate) => candidate.name === name)
  if (state === undefined) throw new Error(`No icon state named ${name}.`)
  return state
}

describe('Icon', () => {
  it('renders the labelled state as an image named by its label', async () => {
    const state = iconState('labelled')
    const screen = await render(UiIcon, { props: state.props })

    await expect.element(screen.getByRole('img', { name: state.props.label })).toBeVisible()
  })

  it('renders the decorative state hidden from assistive technology', async () => {
    const screen = await render(UiIcon, { props: iconState('decorative').props })

    await expect
      .element(screen.getByRole('img', { includeHidden: true }))
      .toHaveAttribute('aria-hidden', 'true')
  })

  it('without a label is hidden from assistive technology, at 16px', async () => {
    const screen = await render(UiIcon, { props: { name: 'close' } })

    await expect
      .element(screen.getByRole('img', { includeHidden: true }))
      .toHaveAttribute('aria-hidden', 'true')
    await expect
      .element(screen.getByRole('img', { includeHidden: true }))
      .toHaveAttribute('width', EXPECTED_SIZE)
  })

  it('with a label is an image named by it, at 16px', async () => {
    const screen = await render(UiIcon, { props: { name: 'close', label: 'Close' } })

    const image = screen.getByRole('img', { name: 'Close' })
    await expect.element(image).toBeVisible()
    await expect.element(image).toHaveAttribute('width', EXPECTED_SIZE)
  })
})
