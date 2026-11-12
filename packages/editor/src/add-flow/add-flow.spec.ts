import { DesignStore } from '@keeb-cad/design'
import { subtreeIds } from '@keeb-cad/model/main'
import { type Id, idSchema } from '@keeb-cad/schema'
import { aChainGroup, aFreeGroup, anId, aSlot } from '@keeb-cad/schema/testing'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { nextTick } from 'vue'

import { Selection } from '../selection/selection'
import { designOf } from '../testing/layout-canvas'
import { mountShell } from '../testing/mount-shell'
import { press, pressKey } from '../testing/press'

const SHIFT_G = { key: 'G', code: 'KeyG', shift: true }
const PLACEHOLDER = 'generated if empty'
const TAKEN_A = 'The design already has an item with the id "a".'
const NOT_KEBAB = 'An id is kebab-case.'

const canvas = () => page.getByRole('main', { name: 'Canvas' })
const topBar = () => page.getByRole('banner', { name: 'Top bar' })
const treeRow = (id: string) => page.getByRole('treeitem', { name: id })
const slideOut = () => page.getByRole('complementary', { name: 'Tree', includeHidden: true })
const anyDialog = () => page.getByRole('dialog')
const dialog = (name: string) => page.getByRole('dialog', { name })
const idField = () => anyDialog().getByRole('textbox', { name: 'Id' })
const addButton = () => anyDialog().getByRole('button', { name: 'Add' })
const axis = () => anyDialog().getByRole('radiogroup', { name: 'Axis' })

// Root `root` holding group `g` (slot `a`), then slot `b`.
function arrangedDesign() {
  return designOf([
    aFreeGroup({ id: anId('g'), children: [aSlot({ id: anId('a') })] }),
    aSlot({ id: anId('b') }),
  ])
}

async function arrange({ workspace = 'layout', selected = [] }: Arrangement = {}) {
  const shell = await mountShell({ path: `/design/corne/${workspace}`, design: arrangedDesign() })
  const store = shell.injector.resolve(DesignStore)
  const selection = shell.injector.resolve(Selection)
  selection.select(selected.map(anId))
  const design = () => {
    const current = store.current.getOrUndefined()
    if (current === undefined) throw new Error('No design is open.')
    return current.design
  }
  const before = subtreeIds(design().layout)
  return {
    selection,
    design,
    rootLastChild: () => design().layout.children.at(-1),
    groupG: () => design().layout.children.at(0),
    newIds: (): Id[] => subtreeIds(design().layout).filter((id) => !before.includes(id)),
  }
}

type Arrangement = { workspace?: string; selected?: readonly string[] }

async function focusCanvasAndPress(letter: string) {
  canvas().element().focus()
  press(letter)
  await expect.element(idField()).toHaveFocus()
}

// Opening the Tree focuses its selected row.
async function focusTreeRow(id: string) {
  press('T')
  await expect.element(treeRow(id)).toHaveFocus()
}

async function add() {
  await addButton().click()
  await expect.element(anyDialog()).not.toBeInTheDocument()
}

async function expectRefused(reason: string) {
  await expect.element(idField()).toHaveAttribute('aria-invalid', 'true')
  await expect.element(idField()).toHaveAccessibleDescription(reason)
  await expect.element(addButton()).toHaveAttribute('aria-disabled', 'true')
}

async function expectClear() {
  await expect.element(idField()).not.toHaveAttribute('aria-invalid')
  await expect.element(idField()).toHaveAccessibleDescription('')
  await expect.element(addButton()).not.toHaveAttribute('aria-disabled')
}

describe('the add flow', () => {
  describe('adding to the root', () => {
    it('opens on G as a chain group dialog with an empty Id field and Column checked', async () => {
      await arrange()

      await focusCanvasAndPress('G')

      await expect.element(dialog('Add chain group in root')).toBeVisible()
      await expect.element(idField()).toHaveValue('')
      await expect.element(idField()).toHaveAttribute('placeholder', PLACEHOLDER)
      await expectClear()
      await expect
        .element(axis().getByRole('radio', { name: 'Column ↑' }))
        .toHaveAttribute('aria-checked', 'true')
    })

    it('adds an empty chain column with a generated id on Add and selects it', async () => {
      const shell = await arrange()
      await focusCanvasAndPress('G')

      await add()

      const [added, ...others] = shell.newIds()
      expect({
        others,
        parses: v.is(idSchema, added),
        last: shell.rootLastChild(),
        selected: shell.selection.ids,
      }).toEqual({
        others: [],
        parses: true,
        last: aChainGroup({ id: added, axis: 'y', children: [] }),
        selected: [added],
      })
    })

    it('adds a chain row after Row is picked', async () => {
      const shell = await arrange()
      await focusCanvasAndPress('G')

      await axis().getByRole('radio', { name: 'Row →' }).click()
      await add()

      expect(shell.rootLastChild()).toMatchObject({ arrangement: 'chain', axis: 'x' })
    })

    it('opens one free group dialog with no axis on Shift+G and adds a free group', async () => {
      const shell = await arrange()
      canvas().element().focus()

      pressKey(SHIFT_G)

      await expect.element(dialog('Add free group in root')).toBeVisible()
      expect(anyDialog().all()).toHaveLength(1)
      await expect.element(axis()).not.toBeInTheDocument()
      await add()
      expect(shell.rootLastChild()).toMatchObject({ arrangement: 'free' })
    })

    it('adds the typed id on Enter and selects it', async () => {
      const shell = await arrange()
      await focusCanvasAndPress('G')

      await userEvent.keyboard('thumb')
      await userEvent.keyboard('{Enter}')

      await expect.element(anyDialog()).not.toBeInTheDocument()
      expect({ last: shell.rootLastChild(), selected: shell.selection.ids }).toEqual({
        last: aChainGroup({ id: anId('thumb'), axis: 'y', children: [] }),
        selected: [anId('thumb')],
      })
    })
  })

  describe('a refused id', () => {
    it('shows why a taken id is refused, keeping the text', async () => {
      await arrange()
      await focusCanvasAndPress('G')

      await userEvent.keyboard('a')

      await expectRefused(TAKEN_A)
      await expect.element(idField()).toHaveValue('a')
    })

    it('keeps the dialog and the text on Enter with a taken id, adding nothing', async () => {
      const shell = await arrange()
      await focusCanvasAndPress('G')
      await userEvent.keyboard('a')
      await expectRefused(TAKEN_A)
      const before = shell.design()

      await userEvent.keyboard('{Enter}')

      await expectRefused(TAKEN_A)
      await expect.element(idField()).toHaveValue('a')
      expect(shell.design()).toBe(before)
    })

    it('clears the refusal once the id is free again', async () => {
      await arrange()
      await focusCanvasAndPress('G')
      await userEvent.keyboard('a')
      await expectRefused(TAKEN_A)

      await userEvent.keyboard('b')

      await expect.element(idField()).toHaveValue('ab')
      await expectClear()
    })

    it('generates the id again once the typed text is cleared, selecting it', async () => {
      const shell = await arrange()
      await focusCanvasAndPress('G')
      await userEvent.keyboard('x')

      await userEvent.keyboard('{Backspace}')

      await expectClear()
      await userEvent.keyboard('{Enter}')
      await expect.element(anyDialog()).not.toBeInTheDocument()
      const [added, ...others] = shell.newIds()
      expect({ others, last: shell.rootLastChild()?.id, selected: shell.selection.ids }).toEqual({
        others: [],
        last: added,
        selected: [added],
      })
    })

    it.each([
      ['a malformed id', 'Foo Bar'],
      ['an id of two spaces', '  '],
    ])('shows why %s is refused and adds nothing on Enter', async (_role, typed) => {
      const shell = await arrange()
      await focusCanvasAndPress('G')
      await userEvent.keyboard(typed)
      await expectRefused(NOT_KEBAB)
      await expect.element(idField()).toHaveValue(typed)
      const before = shell.design()

      await userEvent.keyboard('{Enter}')

      await expectRefused(NOT_KEBAB)
      expect(shell.design()).toBe(before)
    })
  })

  describe('the parent', () => {
    it('adds a slot after the last child of the selected group and selects it', async () => {
      const shell = await arrange({ selected: ['g'] })
      await focusCanvasAndPress('S')
      await expect.element(dialog('Add slot in g')).toBeVisible()

      await add()

      const [added] = shell.newIds()
      expect({ children: shell.groupG(), selected: shell.selection.ids }).toEqual({
        children: aFreeGroup({
          id: anId('g'),
          children: [aSlot({ id: anId('a') }), aSlot({ id: added })],
        }),
        selected: [added],
      })
    })

    it("adds a slot to the selected slot's group and selects it", async () => {
      const shell = await arrange({ selected: ['a'] })
      await focusCanvasAndPress('S')

      await add()

      const [added] = shell.newIds()
      expect({ last: shell.groupG(), selected: shell.selection.ids }).toMatchObject({
        last: { children: [aSlot({ id: anId('a') }), aSlot({ id: added })] },
        selected: [added],
      })
    })

    it('adds a slot inside the chain group it just added', async () => {
      const shell = await arrange({ selected: ['g'] })
      await focusCanvasAndPress('G')
      await add()
      await expect.element(canvas()).toHaveFocus()

      await focusCanvasAndPress('S')
      await add()

      const [group, slot] = shell.newIds()
      expect({ children: shell.groupG(), selected: shell.selection.ids }).toEqual({
        children: aFreeGroup({
          id: anId('g'),
          children: [
            aSlot({ id: anId('a') }),
            aChainGroup({ id: group, axis: 'y', children: [aSlot({ id: slot })] }),
          ],
        }),
        selected: [slot],
      })
    })

    it('names the root for a slot selected at the root', async () => {
      await arrange({ selected: ['b'] })

      await focusCanvasAndPress('S')

      await expect.element(dialog('Add slot in root')).toBeVisible()
    })
  })

  describe('where it starts', () => {
    it('opens nothing with no design open', async () => {
      await mountShell({ path: '/design/corne/layout' })
      canvas().element().focus()

      const keydown = pressKey({ key: 'g', code: 'KeyG' })
      await nextTick()

      expect({ dialog: anyDialog().query(), prevented: keydown.defaultPrevented }).toEqual({
        dialog: null,
        prevented: false,
      })
    })

    it('opens nothing and leaves G and S to the top bar with focus there', async () => {
      const shell = await arrange()
      const before = shell.design()
      topBar().element().focus()

      const keydowns = [pressKey({ key: 'g', code: 'KeyG' }), pressKey({ key: 's', code: 'KeyS' })]
      await nextTick()

      expect({
        dialog: anyDialog().query(),
        design: shell.design(),
        prevented: keydowns.map((keydown) => keydown.defaultPrevented),
      }).toEqual({ dialog: null, design: before, prevented: [false, false] })
    })

    it('opens from a focused Tree row off Layout', async () => {
      await arrange({ workspace: 'outline', selected: ['b'] })
      await focusTreeRow('b')

      press('G')

      await expect.element(dialog('Add chain group in root')).toBeVisible()
    })

    it('opens nothing with focus on the canvas off Layout', async () => {
      await arrange({ workspace: 'outline' })
      canvas().element().focus()

      const keydown = pressKey({ key: 'g', code: 'KeyG' })
      await nextTick()

      expect({ dialog: anyDialog().query(), prevented: keydown.defaultPrevented }).toEqual({
        dialog: null,
        prevented: false,
      })
    })
  })

  describe('cancelling', () => {
    it('closes on Esc, adding nothing and focusing the canvas again', async () => {
      const shell = await arrange()
      const before = shell.design()
      await focusCanvasAndPress('G')

      await userEvent.keyboard('{Escape}')

      await expect.element(anyDialog()).not.toBeInTheDocument()
      await expect.element(canvas()).toHaveFocus()
      expect(shell.design()).toBe(before)
    })

    it('closes on Esc with Add focused, leaving the Tree open', async () => {
      const shell = await arrange({ selected: ['b'] })
      const before = shell.design()
      await focusTreeRow('b')
      press('S')
      await expect.element(idField()).toHaveFocus()
      addButton().element().focus()

      await userEvent.keyboard('{Escape}')

      await expect.element(anyDialog()).not.toBeInTheDocument()
      await expect.element(slideOut()).toBeVisible()
      expect(shell.design()).toBe(before)
    })

    it('starts with an empty field again after Esc', async () => {
      await arrange()
      await focusCanvasAndPress('G')
      await userEvent.keyboard('x')
      await userEvent.keyboard('{Escape}')
      await expect.element(anyDialog()).not.toBeInTheDocument()

      await focusCanvasAndPress('G')

      await expect.element(idField()).toHaveValue('')
    })
  })
})
