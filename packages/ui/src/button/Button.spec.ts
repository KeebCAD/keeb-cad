import { describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'

import { buttonStates } from '../../workbench/states/button-states'
import { cssRgb } from '../testing/css-rgb'
import '../theme/theme.css'
import UiButton from './UiButton.vue'

const REASON = 'Nothing to export yet'

describe('Button', () => {
  it.each(buttonStates)('renders the $name state as a button named by its label', async (state) => {
    const screen = await render(UiButton, { props: state.props, slots: state.slots })

    await expect.element(screen.getByRole('button', { name: 'Export' })).toBeVisible()
  })

  it.each([
    ['dark', '#303446', '#838ba7'],
    ['light', '#eff1f5', '#7c7f93'],
  ])(
    'under the %s theme fills with panel and edges with border-interactive',
    async (theme, background, border) => {
      const screen = await render({
        render: () =>
          h(
            'div',
            { 'data-theme': theme },
            h(UiButton, null, () => 'Export'),
          ),
      })

      const style = getComputedStyle(screen.getByRole('button').element())
      expect({ background: style.backgroundColor, border: style.borderTopColor }).toEqual({
        background: cssRgb(background),
        border: cssRgb(border),
      })
    },
  )

  it.each([
    ['dark', '#737994', '#51576d'],
    ['light', '#9ca0b0', '#bcc0cc'],
  ])(
    'with a disabled reason under the %s theme writes in text-faint and edges with border',
    async (theme, text, border) => {
      const screen = await render({
        render: () =>
          h(
            'div',
            { 'data-theme': theme },
            h(UiButton, { disabledReason: REASON }, () => 'Export'),
          ),
      })

      const style = getComputedStyle(screen.getByRole('button').element())
      expect({ color: style.color, border: style.borderTopColor }).toEqual({
        color: cssRgb(text),
        border: cssRgb(border),
      })
    },
  )

  it('puts a passed class on the button', async () => {
    const screen = await render(UiButton, {
      attrs: { class: 'ml-1' },
      slots: { default: () => 'Export' },
    })

    await expect.element(screen.getByRole('button', { name: 'Export' })).toHaveClass('ml-1')
  })

  it('keeps focus when its disabled reason is cleared', async () => {
    const screen = await render(UiButton, {
      props: { disabledReason: REASON },
      slots: { default: () => 'Export' },
    })
    const button = screen.getByRole('button', { name: 'Export' }).element()
    button.focus()

    await screen.rerender({ disabledReason: undefined })

    expect(document.activeElement).toBe(button)
  })

  it('emits click when enabled', async () => {
    const screen = await render(UiButton, { slots: { default: () => 'Export' } })

    await screen.getByRole('button').click()

    expect(screen.emitted('click')).toHaveLength(1)
  })

  it('with a disabled reason is aria-disabled and emits no click', async () => {
    const screen = await render(UiButton, {
      props: { disabledReason: REASON },
      slots: { default: () => 'Export' },
    })
    const button = screen.getByRole('button', { name: 'Export' })

    // Playwright waits for an aria-disabled element to become enabled; a person clicks it anyway.
    await button.click({ force: true })

    await expect.element(button).toHaveAttribute('aria-disabled', 'true')
    expect(screen.emitted('click')).toBeUndefined()
  })

  it('with a disabled reason shows the reason in a tooltip once focused', async () => {
    const screen = await render(UiButton, {
      props: { disabledReason: REASON },
      slots: { default: () => 'Export' },
    })

    screen.getByRole('button', { name: 'Export' }).element().focus()

    const tooltip = page.getByRole('tooltip')
    await expect.element(tooltip).toBeVisible()
    await expect.element(tooltip).toHaveTextContent(REASON)
  })
})
