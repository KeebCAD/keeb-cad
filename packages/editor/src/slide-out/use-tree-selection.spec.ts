import {
  aFreeGroup,
  aLayoutRow,
  aMeta,
  anId,
  aPlacementId,
  aSlot,
  aUnibodyForm,
} from '@keeb-cad/schema/testing'
import { aDesign, aLayout } from '@keeb-cad/schema/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { emulateColorScheme } from '../testing/color-scheme'
import { key } from '../testing/canvas-queries'
import { designOf } from '../testing/designs'
import { arrangeLayoutCanvas } from '../testing/layout-canvas'
import { keyAt, layoutOf } from '../testing/layout-rows'
import { mountShell } from '../testing/mount-shell'
import { Selection } from '../selection/selection'

const LEFT_KEY = 'left/thumbfan-near-home'
const RIGHT_KEY = 'right/thumbfan-near-home'

const treeRow = (id: string) => page.getByRole('treeitem', { name: id, exact: true })
const openTree = () => page.getByRole('button', { name: 'Tree', exact: true }).click()

// Group thumbfan holding slot thumbfan-near-home, both drawn on both halves.
async function arrange() {
  const design = designOf([
    aFreeGroup({ id: anId('thumbfan'), children: [aSlot({ id: anId('thumbfan-near-home') })] }),
  ])
  const shell = await arrangeLayoutCanvas(design)
  shell.post(
    layoutOf({
      'left/thumbfan': aLayoutRow({ kind: 'group', part: -1 }),
      'right/thumbfan': aLayoutRow({ kind: 'group', part: -1 }),
      [LEFT_KEY]: keyAt(-60),
      [RIGHT_KEY]: keyAt(60),
    }),
  )
  await expect.element(key(RIGHT_KEY)).toBeInTheDocument()
  return shell
}

function pressed() {
  return {
    left: key(LEFT_KEY).element().getAttribute('aria-pressed'),
    right: key(RIGHT_KEY).element().getAttribute('aria-pressed'),
  }
}

describe("the Tree's selection", () => {
  beforeEach(() => emulateColorScheme('dark'))

  it.each([
    ['a right key', RIGHT_KEY, { left: 'false', right: 'true' }],
    ['a left key', LEFT_KEY, { left: 'true', right: 'false' }],
  ])(
    'shows the row selected for a click of %s, which alone is pressed',
    async (_role, id, expected) => {
      const shell = await arrange()

      await key(id).click()
      await openTree()

      expect({ selected: shell.selection.ids, pressed: pressed() }).toEqual({
        selected: [aPlacementId(id)],
        pressed: expected,
      })
      await expect.element(treeRow('thumbfan-near-home')).toHaveAttribute('aria-selected', 'true')
    },
  )

  it('selects the authored left side for a click of a row, pressing only the left key', async () => {
    const shell = await arrange()
    await openTree()

    await treeRow('thumbfan-near-home').click()

    expect({ selected: shell.selection.ids, pressed: pressed() }).toEqual({
      selected: [aPlacementId(LEFT_KEY)],
      pressed: { left: 'true', right: 'false' },
    })
  })

  it('selects the unibody side for a click of a row in a unibody design', async () => {
    const design = aDesign({
      meta: aMeta({ form: aUnibodyForm() }),
      layout: aLayout({ children: [aSlot({ id: anId('k') })] }),
    })
    const shell = await mountShell({ path: '/design/corne/layout', design })
    await openTree()

    await treeRow('k').click()

    expect(shell.injector.resolve(Selection).ids).toEqual([aPlacementId('whole/k')])
  })
})
