import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'

import { severityCountStates } from '../../workbench/states/severity-count-states'
import { cssRgb } from '../testing/css-rgb'
import '../theme/theme.css'
import UiSeverityCount from './UiSeverityCount.vue'

describe('SeverityCount', () => {
  it.each(severityCountStates)('renders the $name state visibly', async (state) => {
    const screen = await render(UiSeverityCount, { props: state.props })

    await expect
      .element(screen.getByText(String(state.props.count), { exact: false }))
      .toBeVisible()
  })

  it.each([
    ['plural below one', 'error', 0, '0 errors'],
    ['singular on one', 'error', 1, '1 error'],
    ['plural above one', 'error', 2, '2 errors'],
    ['plural below one', 'warning', 0, '0 warnings'],
    ['singular on one', 'warning', 1, '1 warning'],
    ['plural above one', 'warning', 2, '2 warnings'],
  ] as const)('reads %s for a %s count of %i', async (_role, severity, count, expected) => {
    const screen = await render(UiSeverityCount, { props: { severity, count } })

    await expect.element(screen.getByText(expected, { exact: true })).toBeVisible()
  })

  it.each([
    ['error', '●0 errors'],
    ['warning', '▲0 warnings'],
  ] as const)('shows the %s glyph as text before the number', async (severity, expected) => {
    const screen = await render(UiSeverityCount, { props: { severity, count: 0 } })

    expect(screen.container.textContent).toBe(expected)
  })

  it.each([
    ['strokes an undimmed', false, '1px'],
    ['leaves unstroked a dimmed', true, '0px'],
  ])('%s warning glyph', async (_role, dimmed, expected) => {
    const screen = await render({
      render: () =>
        h(
          'div',
          { 'data-theme': 'light' },
          h(UiSeverityCount, { severity: 'warning', count: 0, dimmed }),
        ),
    })

    const glyph = screen.getByText('▲', { exact: true }).element()
    expect(getComputedStyle(glyph).getPropertyValue('-webkit-text-stroke-width')).toBe(expected)
  })

  it.each([
    ['dark', 'error', '#e78284', '#c6d0f5'],
    ['light', 'error', '#d20f39', '#4c4f69'],
    ['dark', 'warning', '#e5c890', '#c6d0f5'],
    ['light', 'warning', '#df8e1d', '#4c4f69'],
  ] as const)(
    'under the %s theme colours the %s glyph by severity and the number in text',
    async (theme, severity, glyph, number) => {
      const screen = await render({
        render: () => h('div', { 'data-theme': theme }, h(UiSeverityCount, { severity, count: 0 })),
      })

      const count = screen.getByText('0', { exact: false }).element()
      const mark = count.previousElementSibling
      expect({
        glyph: mark === null ? undefined : getComputedStyle(mark).color,
        number: getComputedStyle(count).color,
      }).toEqual({ glyph: cssRgb(glyph), number: cssRgb(number) })
    },
  )

  it.each([
    ['dark', '#a5adce'],
    ['light', '#5c5f77'],
  ] as const)('dims the number to text-muted under the %s theme', async (theme, muted) => {
    const screen = await render({
      render: () =>
        h(
          'div',
          { 'data-theme': theme },
          h(UiSeverityCount, { severity: 'error', count: 0, dimmed: true }),
        ),
    })

    expect(getComputedStyle(screen.getByText('0', { exact: false }).element()).color).toBe(
      cssRgb(muted),
    )
  })
})
