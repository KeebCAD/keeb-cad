import { parametersCommandsModule } from '@keeb-cad/commands'
import { DesignStore } from '@keeb-cad/design'
import {
  dependencyCycleMessage,
  parameterInUseMessage,
  unitMismatchMessage,
} from '@keeb-cad/model/main'
import type { Node, Parameter } from '@keeb-cad/schema'
import {
  aDesign,
  aGap,
  aLayout,
  aLength,
  aMeta,
  anExpression,
  anId,
  aParameter,
  aParameterName,
  aPlacementId,
  aSlot,
} from '@keeb-cad/schema/testing'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { typingPauseMs } from '../expression-field/typing-pause'
import { Selection } from '../selection/selection'
import { canvas } from '../testing/canvas-queries'
import { mountShell } from '../testing/mount-shell'
import { pressKey } from '../testing/press'

const DESIGN_ID = anId('corne')
const NOT_A_NAME = 'A parameter name is a letter, then letters, digits or _.'
const F2 = { key: 'F2', code: 'F2' }

const panel = () => page.getByRole('complementary', { name: 'Parameters', exact: true })
const rows = () => panel().getByRole('listitem')
const rowOf = (name: string) => rows().filter({ hasText: name })
// The name comes first in its row; the value field's hidden label repeats it.
const nameOf = (name: string) => rowOf(name).getByText(name, { exact: true }).first()
const valueOf = (name: string) => panel().getByRole('combobox', { name, exact: true })
const addParameter = () => panel().getByRole('button', { name: 'Add parameter' })
const anyDialog = () => page.getByRole('dialog')
const addDialog = () => page.getByRole('dialog', { name: 'Add parameter' })
const renameDialog = () => page.getByRole('dialog', { name: 'Rename parameter' })
const dialogField = (label: string) => anyDialog().getByRole('textbox', { name: label })
const dialogButton = (name: string) => anyDialog().getByRole('button', { name, exact: true })

const parameter = (name: string, value: string) =>
  aParameter({ name: aParameterName(name), value: anExpression(value) })

// Opens the Parameters tab from its rail button, which focuses the first name.
async function arrange({
  parameters = [],
  gapX = '1mm',
  children = [],
  selected = [],
}: Arrangement) {
  const design = aDesign({
    meta: aMeta({ id: DESIGN_ID, gap: aGap({ x: aLength(gapX), y: aLength('1mm') }) }),
    parameters,
    layout: aLayout({ id: anId('root'), children }),
  })
  const shell = await mountShell({
    path: '/design/corne/layout',
    design,
    modules: [parametersCommandsModule],
  })
  shell.injector.resolve(Selection).select(selected.map(aPlacementId))
  await page.getByRole('button', { name: 'Parameters', exact: true }).click()
  await expect.element(panel()).toBeVisible()
  const store = shell.injector.resolve(DesignStore)
  const current = () => {
    const committed = store.current.getOrUndefined()
    if (committed === undefined) throw new Error('No design is open.')
    return committed.design
  }
  return {
    current,
    // Each undo the history holds, latest first, as the parameters it leaves.
    undoneParameters: (): Parameter[][] => {
      const undone: Parameter[][] = []
      while (store.undo().isOk()) undone.push(current().parameters as Parameter[])
      return undone
    },
  }
}

type Arrangement = {
  parameters?: Parameter[]
  gapX?: string
  children?: Node[]
  selected?: readonly string[]
}

function freezeTime() {
  vi.useFakeTimers()
  onTestFinished(() => {
    vi.useRealTimers()
  })
  return (milliseconds: number) => {
    vi.advanceTimersByTime(milliseconds)
  }
}

async function focusName(name: string) {
  nameOf(name).element().focus()
  await expect.element(nameOf(name)).toHaveFocus()
}

async function renameFocused(to: string) {
  await userEvent.keyboard('{F2}')
  await expect.element(renameDialog()).toBeVisible()
  await userEvent.fill(dialogField('Name'), to)
  await userEvent.keyboard('{Enter}')
}

describe('the Parameters tab', () => {
  describe('rows', () => {
    it("lists one row per parameter in the design's order, a computed value with its evaluated suffix", async () => {
      await arrange({ parameters: [parameter('b', '1mm'), parameter('a', 'b * 2')] })

      const fields = panel()
        .getByRole('combobox')
        .elements()
        .map((input) => ({
          name: (input as HTMLInputElement).labels?.[0]?.textContent.trim(),
          value: (input as HTMLInputElement).value,
        }))

      expect(fields).toEqual([
        { name: 'b', value: '1mm' },
        { name: 'a', value: 'b * 2' },
      ])
      await expect.element(rows().nth(1).getByText('= 2 mm')).toBeVisible()
    })

    it('focuses the first name when opened from its rail button', async () => {
      await arrange({ parameters: [parameter('wall', '3mm'), parameter('ks', '19mm')] })

      await expect.element(nameOf('wall')).toHaveFocus()
    })

    it('reads No parameters. in a design with none', async () => {
      await arrange({})

      await expect.element(panel().getByText('No parameters.', { exact: true })).toBeVisible()
      await expect.element(panel().getByRole('list')).not.toBeInTheDocument()
    })

    it('shows a later parameter repeating a taken name as read-only text, which F2 and Delete leave alone', async () => {
      const arranged = [parameter('wall', '1mm'), parameter('wall', 'wall * 2')]
      const shell = await arrange({ parameters: arranged })
      const duplicate = rows().nth(1)
      await expect.element(duplicate).toHaveTextContent('wall = wall * 2 = 2 mm')
      await expect.element(duplicate.getByRole('combobox')).not.toBeInTheDocument()

      await duplicate.click()
      await userEvent.keyboard('{F2}')
      await userEvent.keyboard('{Delete}')

      await expect.element(anyDialog()).not.toBeInTheDocument()
      expect(shell.current().parameters).toEqual(arranged)
    })
  })

  describe('the value field', () => {
    it('sets the value of a parameter gap x reads, and one undo restores it', async () => {
      const shell = await arrange({ parameters: [parameter('wall', '3mm')], gapX: 'wall' })

      await userEvent.fill(valueOf('wall'), '4mm')
      await userEvent.keyboard('{Enter}')
      const edited = shell.current().parameters

      expect({ edited, undone: shell.undoneParameters() }).toEqual({
        edited: [parameter('wall', '4mm')],
        undone: [[parameter('wall', '3mm')]],
      })
    })

    it('keeps one focus session as one undo entry', async () => {
      const shell = await arrange({ parameters: [parameter('wall', '3mm')] })
      const advance = freezeTime()

      await userEvent.fill(valueOf('wall'), '4mm')
      advance(typingPauseMs)
      await userEvent.fill(valueOf('wall'), '5mm')
      canvas().element().focus()
      const edited = shell.current().parameters

      expect({ edited, undone: shell.undoneParameters() }).toEqual({
        edited: [parameter('wall', '5mm')],
        undone: [[parameter('wall', '3mm')]],
      })
    })

    it('shows a value naming its own parameter as a loop, invalid, the design unchanged', async () => {
      const arranged = [parameter('wall', '3mm')]
      const shell = await arrange({ parameters: arranged })
      const advance = freezeTime()

      await userEvent.fill(valueOf('wall'), 'wall')
      advance(typingPauseMs)

      await expect.element(valueOf('wall')).toHaveAttribute('aria-invalid', 'true')
      await expect
        .element(valueOf('wall'))
        .toHaveAccessibleDescription(dependencyCycleMessage([aParameterName('wall')], 'parameters'))
      expect(shell.current().parameters).toEqual(arranged)
    })
  })

  describe('Delete on a name', () => {
    it('deletes an unused parameter as one undo entry, leaving the selected slot', async () => {
      const shell = await arrange({
        parameters: [parameter('wall', '3mm')],
        children: [aSlot({ id: anId('a') })],
        selected: ['left/a'],
      })
      await focusName('wall')

      await userEvent.keyboard('{Delete}')

      await expect.element(panel().getByText('No parameters.')).toBeVisible()
      expect({
        parameters: shell.current().parameters,
        children: shell.current().layout.children,
        undone: shell.undoneParameters(),
      }).toEqual({
        parameters: [],
        children: [aSlot({ id: anId('a') })],
        undone: [[parameter('wall', '3mm')]],
      })
    })

    it('deletes an unused parameter on Backspace', async () => {
      const shell = await arrange({ parameters: [parameter('wall', '3mm')] })
      await focusName('wall')

      await userEvent.keyboard('{Backspace}')

      await expect.element(panel().getByText('No parameters.')).toBeVisible()
      expect(shell.current().parameters).toEqual([])
    })

    it('keeps a used parameter, showing the refusal under its row', async () => {
      const arranged = [parameter('wall', '3mm')]
      const shell = await arrange({ parameters: arranged, gapX: 'wall' })
      await focusName('wall')

      await userEvent.keyboard('{Delete}')

      await expect
        .element(
          rowOf('wall')
            .getByRole('alert')
            .getByText(parameterInUseMessage('wall', [DESIGN_ID]), { exact: true }),
        )
        .toBeVisible()
      expect(shell.current().parameters).toEqual(arranged)
    })

    it('clears the refusal when focus moves to another row', async () => {
      await arrange({
        parameters: [parameter('wall', '3mm'), parameter('ks', '19mm')],
        gapX: 'wall',
      })
      await focusName('wall')
      await userEvent.keyboard('{Delete}')
      await expect.element(rowOf('wall').getByRole('alert')).toBeVisible()

      await focusName('ks')

      await expect.element(panel().getByRole('alert')).not.toBeInTheDocument()
    })

    it('edits the text in the value field, keeping the parameter', async () => {
      const arranged = [parameter('wall', '3mm')]
      const shell = await arrange({ parameters: arranged })
      await userEvent.click(valueOf('wall'))

      await userEvent.keyboard('{Home}{Delete}')

      await expect.element(valueOf('wall')).toHaveValue('mm')
      expect(shell.current().parameters).toEqual(arranged)
    })
  })

  it('adds no node on Ctrl+D with a name focused and a slot selected', async () => {
    const shell = await arrange({
      parameters: [parameter('wall', '3mm')],
      children: [aSlot({ id: anId('a') })],
      selected: ['left/a'],
    })
    await focusName('wall')

    await userEvent.keyboard('{Control>}d{/Control}')

    expect(shell.current().layout.children).toEqual([aSlot({ id: anId('a') })])
  })

  describe('renaming', () => {
    it('renames the parameter whose name has focus on F2, and every use of it, focusing the name again', async () => {
      const shell = await arrange({ parameters: [parameter('wall', '3mm')], gapX: 'wall' })
      await focusName('wall')

      await renameFocused('side')

      await expect.element(anyDialog()).not.toBeInTheDocument()
      await expect.element(valueOf('side')).toHaveValue('3mm')
      await expect.element(nameOf('side')).toHaveFocus()
      expect(shell.current().meta.gap.x).toBe('side')
    })

    it('opens the rename dialog on a double-click of a name, filled with it', async () => {
      await arrange({ parameters: [parameter('wall', '3mm')] })

      await nameOf('wall').dblClick()

      await expect.element(renameDialog()).toBeVisible()
      await expect.element(dialogField('Name')).toHaveValue('wall')
    })

    it('stays open on a name another parameter has, with the reason', async () => {
      const arranged = [parameter('wall', '3mm'), parameter('ks', '19mm')]
      const shell = await arrange({ parameters: arranged })
      await focusName('wall')

      await renameFocused('ks')

      await expect.element(renameDialog()).toBeVisible()
      await expect
        .element(dialogField('Name'))
        .toHaveAccessibleDescription('The design already has a parameter named "ks".')
      expect(shell.current().parameters).toEqual(arranged)
    })

    it('disables Rename for a name that is no parameter name, with the reason', async () => {
      await arrange({ parameters: [parameter('wall', '3mm')] })
      await focusName('wall')
      await userEvent.keyboard('{F2}')

      await userEvent.fill(dialogField('Name'), '2k')

      await expect.element(dialogButton('Rename')).toHaveAttribute('aria-disabled', 'true')
      await expect.element(dialogField('Name')).toHaveAccessibleDescription(NOT_A_NAME)
    })

    it('opens nothing on F2 with focus on the canvas, leaving the key unclaimed', async () => {
      await arrange({ parameters: [parameter('wall', '3mm')] })
      canvas().element().focus()

      const keydown = pressKey(F2)

      await expect.element(anyDialog()).not.toBeInTheDocument()
      expect(keydown.defaultPrevented).toBe(false)
    })
  })

  describe('adding', () => {
    it('adds the parameter as one undo entry, focusing + again', async () => {
      const shell = await arrange({})
      await addParameter().click()

      await userEvent.fill(dialogField('Name'), 'wall')
      await userEvent.fill(dialogField('Value'), '3mm')
      await userEvent.keyboard('{Enter}')

      await expect.element(anyDialog()).not.toBeInTheDocument()
      await expect.element(valueOf('wall')).toHaveValue('3mm')
      await expect.element(addParameter()).toHaveFocus()
      expect(shell.undoneParameters()).toEqual([[]])
    })

    it('disables Add with nothing typed, showing why', async () => {
      await arrange({})

      await addParameter().click()

      await expect.element(dialogButton('Add')).toHaveAttribute('aria-disabled', 'true')
      await expect.element(addDialog().getByText(NOT_A_NAME, { exact: true })).toBeVisible()
    })

    it('disables Add for a value adding a number to a length, showing why', async () => {
      await arrange({})
      await addParameter().click()

      await userEvent.fill(dialogField('Name'), 'wall')
      await userEvent.fill(dialogField('Value'), '5 + 1mm')

      await expect.element(dialogButton('Add')).toHaveAttribute('aria-disabled', 'true')
      await expect
        .element(
          addDialog().getByText(unitMismatchMessage([aParameterName('wall')]), { exact: true }),
        )
        .toBeVisible()
    })

    it('stays open on a name a parameter has, keeping its value', async () => {
      const arranged = [parameter('wall', '2mm')]
      const shell = await arrange({ parameters: arranged })
      await addParameter().click()

      await userEvent.fill(dialogField('Name'), 'wall')
      await userEvent.fill(dialogField('Value'), '1mm')
      await userEvent.keyboard('{Enter}')

      await expect
        .element(
          addDialog().getByText('The design already has a parameter named "wall".', {
            exact: true,
          }),
        )
        .toBeVisible()
      expect(shell.current().parameters).toEqual(arranged)
    })
  })
})
