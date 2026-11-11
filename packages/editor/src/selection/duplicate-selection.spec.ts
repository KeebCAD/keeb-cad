import { Result } from '@keeb-cad/result'
import { expectResult } from '@keeb-cad/result/testing'
import { DesignStore } from '@keeb-cad/design'
import type { Id } from '@keeb-cad/schema'
import { anId } from '@keeb-cad/schema/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { emulateColorScheme } from '../testing/color-scheme'
import { designWith } from '../testing/layout-canvas'
import { mountShell } from '../testing/mount-shell'
import { pressKey } from '../testing/press'
import { DuplicateSelection } from './duplicate-selection'
import { Selection } from './selection'

const CTRL_D = { key: 'd', code: 'KeyD', ctrl: true }

const canvas = () => page.getByRole('main', { name: 'Canvas' })

async function arrange(selected: readonly Id[]) {
  const shell = await mountShell({
    path: '/design/corne/layout',
    design: designWith('thumb-home', 'thumb-far'),
  })
  const store = shell.injector.resolve(DesignStore)
  const selection = shell.injector.resolve(Selection)
  selection.select(selected)
  return {
    ...shell,
    selection,
    children: () =>
      store.current.map((committed) => committed.design.layout.children).getOrUndefined(),
  }
}

describe('Ctrl+D on the selection', () => {
  beforeEach(() => emulateColorScheme('dark'))

  it('puts a copy right after the selected key, selects it and claims the chord', async () => {
    const shell = await arrange([anId('thumb-home')])
    canvas().element().focus()

    const keydown = pressKey(CTRL_D)

    await expect.poll(() => shell.selection.ids).toEqual([anId('thumb-home-2')])
    expect({ children: shell.children(), prevented: keydown.defaultPrevented }).toEqual({
      children: designWith('thumb-home', 'thumb-home-2', 'thumb-far').layout.children,
      prevented: true,
    })
  })

  it('claims the chord with nothing selected, changing nothing', async () => {
    const shell = await arrange([])
    const before = shell.children()
    canvas().element().focus()

    const keydown = pressKey(CTRL_D)

    expect({ children: shell.children(), prevented: keydown.defaultPrevented }).toEqual({
      children: before,
      prevented: true,
    })
  })

  it.each([
    ['nothing selected', []],
    ['the root selected', [anId('root')]],
  ])('with %s, is unavailable and changes nothing', async (_role, selected) => {
    const shell = await arrange(selected)
    const before = shell.children()
    canvas().element().focus()

    pressKey(CTRL_D)

    expectResult(
      shell.invoke.available(DuplicateSelection),
      Result.err({ kind: 'unavailable', command: DuplicateSelection.id }),
    )
    expect(shell.children()).toEqual(before)
  })
})
