import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'

import './theme.css'

describe('the theme stylesheet', () => {
  it('sets font-mono text in JetBrains Mono', async () => {
    const screen = await render({ render: () => h('code', { class: 'font-mono' }, '19 mm') })

    expect(getComputedStyle(screen.getByText('19 mm').element()).fontFamily).toMatch(
      /^"JetBrains Mono Variable"/,
    )
  })
})
