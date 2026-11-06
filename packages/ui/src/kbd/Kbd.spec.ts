import { getPlatform } from '@zag-js/hotkeys'
import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-vue'

import { kbdStates } from '../../workbench/states/kbd-states'
import { formatHotkey } from '../hotkeys/format-hotkey'
import UiKbd from './UiKbd.vue'

describe('Kbd', () => {
  it.each(kbdStates)('renders the $name state as its formatted hotkey', async (state) => {
    const screen = await render(UiKbd, { props: state.props })

    await expect
      .element(screen.getByText(formatHotkey(state.props.hotkey, getPlatform()), { exact: true }))
      .toBeVisible()
  })
})
