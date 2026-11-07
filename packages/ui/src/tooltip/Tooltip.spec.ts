import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'

import { tooltipStates } from '../../workbench/states/tooltip-states'
import UiTooltip from './UiTooltip.vue'

const CONTENT = 'Close the panel'

function arrange() {
  return render(UiTooltip, {
    props: { content: CONTENT },
    slots: { default: () => h('button', { type: 'button' }, 'Close') },
  })
}

describe('Tooltip', () => {
  it.each(tooltipStates)('renders the $name state with its trigger', async (state) => {
    const screen = await render(UiTooltip, { props: state.props, slots: state.slots })

    await expect.element(screen.getByRole('button', { name: 'Close' })).toBeVisible()
  })

  it('shows its content once the trigger is focused', async () => {
    const screen = await arrange()

    const trigger = screen.getByRole('button', { name: 'Close' })
    await userEvent.tab()
    await expect.element(trigger).toHaveFocus()

    const tooltip = page.getByRole('tooltip')
    await expect.element(tooltip).toBeVisible()
    await expect.element(tooltip).toHaveTextContent(CONTENT)
  })

  it.each([
    ['hidden just before the delay', 699, null],
    ['shown on the delay', 700, CONTENT],
    ['shown just after the delay', 701, CONTENT],
  ])('after a pointer enters, is %s', async (_, elapsed, expectedContent) => {
    const screen = await arrange()
    vi.useFakeTimers()
    onTestFinished(() => {
      vi.useRealTimers()
    })

    screen
      .getByRole('button', { name: 'Close' })
      .element()
      .dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse' }))
    await vi.advanceTimersByTimeAsync(elapsed)
    vi.useRealTimers()

    expect(page.getByRole('tooltip').query()?.textContent ?? null).toBe(expectedContent)
  })

  it('portals its content out of the rendered component', async () => {
    const screen = await arrange()

    const trigger = screen.getByRole('button', { name: 'Close' })
    await userEvent.tab()
    await expect.element(trigger).toHaveFocus()

    const tooltip = page.getByRole('tooltip')
    await expect.element(tooltip).toBeVisible()
    expect(screen.container.contains(tooltip.element())).toBe(false)
  })
})
