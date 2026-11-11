import { DesignStore } from '@keeb-cad/design'
import type { Id } from '@keeb-cad/schema'
import { anId } from '@keeb-cad/schema/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import type { InvokeEvent } from '../invoke/types'
import { emulateColorScheme } from '../testing/color-scheme'
import { designWith } from '../testing/layout-canvas'
import { mountShell } from '../testing/mount-shell'
import { press, pressKey } from '../testing/press'
import { DeleteSelection } from './delete-selection'
import { Selection } from './selection'

const DELETE = { key: 'Delete', code: 'Delete' }
const BACKSPACE = { key: 'Backspace', code: 'Backspace' }
const ROOT = anId('root')

const canvas = () => page.getByRole('main', { name: 'Canvas' })
const topBar = () => page.getByRole('banner', { name: 'Top bar' })
const treeRow = (id: string) => page.getByRole('treeitem', { name: id })

async function arrange({ workspace = 'layout', selected = [anId('a')] } = {} as Arrangement) {
  const design = designWith('a', 'b')
  const shell = await mountShell({ path: `/design/corne/${workspace}`, design })
  const store = shell.injector.resolve(DesignStore)
  const selection = shell.injector.resolve(Selection)
  selection.select(selected)
  return {
    ...shell,
    selection,
    design: () => store.current.map((committed) => committed.design).getOrUndefined(),
  }
}

type Arrangement = { workspace?: string; selected?: readonly Id[] }

// Opening the Tree focuses its selected row.
async function focusTreeRow(id: string) {
  press('T')
  await expect.element(treeRow(id)).toHaveFocus()
}

describe('Delete on the selection', () => {
  beforeEach(() => emulateColorScheme('dark'))

  it.each([
    ['Delete', DELETE],
    ['Backspace', BACKSPACE],
  ])(
    '%s with focus on the Layout canvas deletes the selected key and claims the key',
    async (_name, key) => {
      const shell = await arrange()
      canvas().element().focus()

      const keydown = pressKey(key)

      expect({
        children: shell.design()?.layout.children,
        selected: shell.selection.ids,
        prevented: keydown.defaultPrevented,
      }).toEqual({ children: designWith('b').layout.children, selected: [], prevented: true })
    },
  )

  it.each([['layout'], ['outline']])(
    'deletes the selected key with focus on its Tree row on %s',
    async (workspace) => {
      const shell = await arrange({ workspace })
      await focusTreeRow('a')

      pressKey(DELETE)

      expect({
        children: shell.design()?.layout.children,
        selected: shell.selection.ids,
      }).toEqual({ children: designWith('b').layout.children, selected: [] })
    },
  )

  it('leaves the design and the key to the top bar with focus there', async () => {
    const shell = await arrange()
    const before = shell.design()
    topBar().element().focus()

    const keydown = pressKey(DELETE)

    expect({ design: shell.design(), prevented: keydown.defaultPrevented }).toEqual({
      design: before,
      prevented: false,
    })
  })

  it.each([
    ['nothing selected', []],
    ['the root selected', [ROOT]],
  ])('with %s, Delete is unavailable and changes nothing', async (_role, selected) => {
    const shell = await arrange({ selected })
    const before = shell.design()
    canvas().element().focus()

    pressKey(DELETE)

    expect({
      design: shell.design(),
      available: shell.invoke.available(DeleteSelection),
    }).toEqual({ design: before, available: false })
  })

  it('is unavailable with focus on the canvas off Layout, changing nothing', async () => {
    const shell = await arrange({ workspace: 'outline' })
    const before = shell.design()
    canvas().element().focus()

    pressKey(DELETE)

    expect({
      design: shell.design(),
      available: shell.invoke.available(DeleteSelection),
    }).toEqual({ design: before, available: false })
  })

  it("reports one press as its command's event, then its own, each when it settles", async () => {
    const shell = await arrange()
    const events: string[] = []
    shell.invoke.events.on('invoke', (event: InvokeEvent) => events.push(event.id))
    canvas().element().focus()

    pressKey(DELETE)

    await expect.poll(() => events).toEqual(['layout.deleteNode', 'selection.deleteSelection'])
    await new Promise((settle) => setTimeout(settle, 0))
    expect(events).toEqual(['layout.deleteNode', 'selection.deleteSelection'])
  })
})
