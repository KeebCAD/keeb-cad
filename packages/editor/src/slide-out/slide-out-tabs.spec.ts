import { describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { mountShell } from '../testing/mount-shell'
import { press } from '../testing/press'

const slideOut = (tab: string) => page.getByRole('complementary', { name: tab, exact: true })
const anySlideOut = () => page.getByRole('complementary', { name: /^(Tree|Parameters)$/ })
const railButton = (tab: string) => page.getByRole('button', { name: tab, exact: true })
const tab = (name: string) => page.getByRole('tab', { name, exact: true })

async function arrange() {
  await mountShell({ path: '/design/corne/layout' })
}

async function expectOpenOn(name: string) {
  await expect.element(slideOut(name)).toBeVisible()
  await expect.element(tab(name)).toHaveAttribute('aria-selected', 'true')
}

describe("the slide-out's tabs", () => {
  it('opens on Parameters from its rail button, which alone is expanded', async () => {
    await arrange()

    await railButton('Parameters').click()

    await expectOpenOn('Parameters')
    await expect.element(railButton('Parameters')).toHaveAttribute('aria-expanded', 'true')
    await expect.element(railButton('Tree')).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes on a press of the rail button of the tab it is open on', async () => {
    await arrange()
    await railButton('Parameters').click()
    await expectOpenOn('Parameters')

    await railButton('Parameters').click()

    await expect.element(anySlideOut()).not.toBeInTheDocument()
  })

  it("switches to the other tab on a press of that tab's rail button, staying open", async () => {
    await arrange()
    await railButton('Parameters').click()
    await expectOpenOn('Parameters')

    await railButton('Tree').click()

    await expectOpenOn('Tree')
    await expect.element(railButton('Tree')).toHaveAttribute('aria-expanded', 'true')
    await expect.element(railButton('Parameters')).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens on T on the tab last used', async () => {
    await arrange()
    await railButton('Parameters').click()
    await expectOpenOn('Parameters')
    press('T')
    await expect.element(anySlideOut()).not.toBeInTheDocument()

    press('T')

    await expectOpenOn('Parameters')
  })

  it('opens on T on Tree before any tab was used', async () => {
    await arrange()

    press('T')

    await expect.element(slideOut('Tree')).toBeVisible()
    await expect.element(tab('Tree')).toHaveAttribute('aria-selected', 'true')
  })

  it('switches to Parameters on a press of its tab in the tab list', async () => {
    await arrange()
    press('T')
    await expectOpenOn('Tree')

    await tab('Parameters').click()

    await expectOpenOn('Parameters')
    await expect.element(railButton('Parameters')).toHaveAttribute('aria-expanded', 'true')
  })
})
