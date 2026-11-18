import { DesignStore } from '@keeb-cad/design'
import { unitMismatchMessage } from '@keeb-cad/model/main'
import { expectOk } from '@keeb-cad/result/testing'
import type { Gap, Node, Parameter } from '@keeb-cad/schema'
import {
  aDesign,
  aGap,
  aLength,
  aMeta,
  anExpression,
  anId,
  aParameter,
  aParameterName,
  aPlacementId,
  aSlot,
  aLayout,
} from '@keeb-cad/schema/testing'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { nextTick } from 'vue'

import { Selection } from '../selection/selection'
import { canvas } from '../testing/canvas-queries'
import { mountShell } from '../testing/mount-shell'
import { pressKey } from '../testing/press'

const PAUSE_MS = 300
const DESIGN_ID = anId('corne')
const ARRANGED_GAP = aGap({ x: aLength('1mm'), y: aLength('1mm') })
const NOT_MM = 'Not a quantity in mm.'
const NOT_AN_EXPRESSION = 'Not an expression.'
const DELETE = { key: 'Delete', code: 'Delete' }
// 1e200 mm × 1e200 evaluates to an infinite length.
const OVERFLOWING = `1${'0'.repeat(200)}mm * 1${'0'.repeat(200)}`

const gapX = () => page.getByRole('combobox', { name: 'gap x' })
const gapY = () => page.getByRole('combobox', { name: 'gap y' })
const list = () => page.getByRole('listbox')
const suffix = () => page.getByText(/^[=≈] /)
const optionLabels = () =>
  page
    .getByRole('option')
    .elements()
    .map((option) => option.textContent.trim())

const parameter = (name: string, value: string) =>
  aParameter({ name: aParameterName(name), value: anExpression(value) })

async function arrange({ parameters = [], children = [], gap = ARRANGED_GAP }: Arrangement = {}) {
  const design = aDesign({
    meta: aMeta({ id: DESIGN_ID, gap }),
    parameters,
    layout: aLayout({ id: anId('root'), children }),
  })
  const shell = await mountShell({ path: '/design/corne/layout', design })
  const store = shell.injector.resolve(DesignStore)
  const current = () => {
    const committed = store.current.getOrUndefined()
    if (committed === undefined) throw new Error('No design is open.')
    return committed.design
  }
  const advance = freezeTime()
  return {
    store,
    selection: shell.injector.resolve(Selection),
    advance,
    gap: (): Gap => current().meta.gap,
    slots: () => current().layout.children,
    // Each undo the history holds, latest first, as the gap it leaves.
    undoneGaps: (): Gap[] => {
      const gaps: Gap[] = []
      while (store.undo().isOk()) gaps.push(current().meta.gap)
      return gaps
    },
  }
}

type Arrangement = { parameters?: Parameter[]; children?: Node[]; gap?: Gap }

function freezeTime() {
  vi.useFakeTimers()
  onTestFinished(() => {
    vi.useRealTimers()
  })
  return (milliseconds: number) => {
    vi.advanceTimersByTime(milliseconds)
  }
}

// Replaces the field's text as one edit, leaving the caret at its end.
async function retype(text: string) {
  await userEvent.fill(gapX(), text)
}

async function expectInvalid(message: string) {
  await expect.element(gapX()).toHaveAttribute('aria-invalid', 'true')
  await expect.element(gapX()).toHaveAccessibleDescription(message)
}

// Esc leaves the field for the canvas, showing the text given.
async function expectLeftForCanvasWith(text: string) {
  await expect.element(canvas()).toHaveFocus()
  await expect.element(gapX()).toHaveValue(text)
  await expect.element(gapX()).not.toHaveAttribute('aria-invalid')
}

async function expectBlurredWith(text: string) {
  await expect.element(gapX()).not.toHaveFocus()
  await expect.element(gapX()).toHaveValue(text)
  await expect.element(gapX()).not.toHaveAttribute('aria-invalid')
}

const gapWithX = (x: string) => aGap({ x: aLength(x), y: aLength('1mm') })

describe('the expression field, on gap x', () => {
  describe('the typing pause', () => {
    it('leaves the design unchanged just before the pause ends', async () => {
      const shell = await arrange()
      await retype('5mm')

      shell.advance(PAUSE_MS - 1)

      expect(shell.gap()).toEqual(ARRANGED_GAP)
    })

    it.each([
      ['when it ends', PAUSE_MS],
      ['just after it ends', PAUSE_MS + 1],
    ])('applies the text as one undo entry %s', async (_role, milliseconds) => {
      const shell = await arrange()
      await retype('5mm')

      shell.advance(milliseconds)

      expect({ gap: shell.gap(), undone: shell.undoneGaps() }).toEqual({
        gap: gapWithX('5mm'),
        undone: [ARRANGED_GAP],
      })
    })
  })

  describe('focus sessions', () => {
    it('coalesces every apply of one session, Enter included, into one undo entry', async () => {
      const shell = await arrange()
      await retype('5mm')
      shell.advance(PAUSE_MS)
      await retype('6mm')

      await userEvent.keyboard('{Enter}')

      expect({ gap: shell.gap(), undone: shell.undoneGaps() }).toEqual({
        gap: gapWithX('6mm'),
        undone: [ARRANGED_GAP],
      })
    })

    it('keeps two focus sessions as two undo entries', async () => {
      const shell = await arrange()
      await retype('5mm')
      canvas().element().focus()
      await retype('6mm')

      canvas().element().focus()

      expect(shell.undoneGaps()).toEqual([gapWithX('5mm'), ARRANGED_GAP])
    })

    it('ends the session on Enter, so the next Enter is a second undo entry', async () => {
      const shell = await arrange()
      await retype('5mm')
      await userEvent.keyboard('{Enter}')
      await retype('6mm')

      await userEvent.keyboard('{Enter}')

      expect(shell.undoneGaps()).toEqual([gapWithX('5mm'), ARRANGED_GAP])
    })

    it('applies unapplied text on blur, before a command run from the canvas', async () => {
      const shell = await arrange({ children: [aSlot({ id: anId('a') })] })
      await retype('5mm')

      canvas().element().focus()
      shell.selection.select([aPlacementId('left/a')])
      pressKey(DELETE)
      const deleted = shell.slots()
      expectOk(shell.store.undo())
      const nodeBack = { slots: shell.slots(), gap: shell.gap() }
      expectOk(shell.store.undo())

      expect({ deleted, nodeBack, gapBack: shell.gap() }).toEqual({
        deleted: [],
        nodeBack: { slots: [aSlot({ id: anId('a') })], gap: gapWithX('5mm') },
        gapBack: ARRANGED_GAP,
      })
    })
  })

  describe('a refused value', () => {
    it.each([
      ['a wrong-unit literal', [], '5deg', NOT_MM],
      ['empty text', [], '', NOT_AN_EXPRESSION],
      ['a parameter in deg', [parameter('wall', '5deg')], 'wall', unitMismatchMessage([DESIGN_ID])],
    ])(
      'shows %s as invalid with its reason after the pause, the design unchanged',
      async (_role, parameters, typed, expectedMessage) => {
        const shell = await arrange({ parameters })
        await retype(typed)

        shell.advance(PAUSE_MS)

        await expectInvalid(expectedMessage)
        expect(shell.gap()).toEqual(ARRANGED_GAP)
      },
    )

    it('commits nothing on Enter', async () => {
      const shell = await arrange()
      await retype('5deg')

      await userEvent.keyboard('{Enter}')

      await expectInvalid(NOT_MM)
      expect(shell.gap()).toEqual(ARRANGED_GAP)
    })

    it("gives way to the design's text on blur, its error cleared", async () => {
      const shell = await arrange()
      await retype('5deg')

      canvas().element().focus()

      await expectBlurredWith('1mm')
      expect(shell.gap()).toEqual(ARRANGED_GAP)
    })
  })

  describe('the evaluated suffix', () => {
    it.each([
      ['a plain literal', '5mm'],
      ['a value that does not evaluate', '5deg'],
      ['a value that overflows to a non-finite number', OVERFLOWING],
    ])('shows none for %s', async (_role, typed) => {
      await arrange()

      await retype(typed)

      await expect.element(gapX()).toHaveValue(typed)
      await expect.element(suffix()).not.toBeInTheDocument()
    })

    it.each([
      ['= for an exact value', 'stagger + 0.37mm', '= 5.37 mm'],
      ['≈ for a value the display rounds', 'stagger + 0.374mm', '≈ 5.37 mm'],
    ])('shows %s', async (_role, typed, expected) => {
      await arrange({ parameters: [parameter('stagger', '5mm')] })

      await retype(typed)

      await expect.element(suffix()).toHaveTextContent(expected)
    })
  })

  describe('the parameter list', () => {
    const wallAndKs = [parameter('wall', '2mm'), parameter('ks', '19mm')]

    it('offers the names the typed name starts, each with its value', async () => {
      await arrange({
        parameters: [
          parameter('wall', '2mm'),
          parameter('wide', 'wall + 0.374mm'),
          parameter('wx', 'wx'),
        ],
      })

      await retype('w')

      await expect.poll(() => optionLabels()).toEqual(['wall = 2 mm', 'wide ≈ 2.37 mm', 'wx'])
    })

    it('shows no list for a name that matches no parameter', async () => {
      const shell = await arrange({ parameters: wallAndKs })
      await retype('zz')

      shell.advance(PAUSE_MS)

      await expect.element(gapX()).toHaveAttribute('aria-invalid', 'true')
      await expect.element(list()).not.toBeInTheDocument()
    })

    it('stays closed on focus and a caret move, with no keystroke, at a matching name', async () => {
      await arrange({ parameters: wallAndKs, gap: gapWithX('wall') })
      gapX().element().focus()

      await userEvent.keyboard('{End}')

      await expect.element(gapX()).toHaveFocus()
      // The caret read on keyup renders on Vue's next flush; frames are faked here.
      await nextTick()
      await expect.element(list()).not.toBeInTheDocument()
    })

    it('replaces the typed name on Enter with the list open, closing it, the design unchanged', async () => {
      const shell = await arrange({ parameters: wallAndKs })
      await retype('wa')
      await expect.element(list()).toBeVisible()

      await userEvent.keyboard('{Enter}')

      await expect.element(gapX()).toHaveValue('wall')
      await expect.element(list()).not.toBeInTheDocument()
      expect(shell.gap()).toEqual(ARRANGED_GAP)
    })

    it('applies an accepted name after the pause', async () => {
      const shell = await arrange({ parameters: wallAndKs })
      await retype('wa')
      await expect.element(list()).toBeVisible()
      await userEvent.keyboard('{Enter}')
      await expect.element(list()).not.toBeInTheDocument()

      shell.advance(PAUSE_MS)

      expect(shell.gap()).toEqual(gapWithX('wall'))
    })

    it('accepts an exactly typed name on the first Enter and applies it on the second', async () => {
      const shell = await arrange({ parameters: wallAndKs })
      await retype('wall')
      await expect.element(list()).toBeVisible()

      await userEvent.keyboard('{Enter}')
      await expect.element(list()).not.toBeInTheDocument()
      const afterAccept = shell.gap()
      await userEvent.keyboard('{Enter}')

      expect({ afterAccept, applied: shell.gap() }).toEqual({
        afterAccept: ARRANGED_GAP,
        applied: gapWithX('wall'),
      })
    })

    it('applies on Tab with the list closed and moves focus to gap y', async () => {
      const shell = await arrange()
      await retype('3mm')

      await userEvent.keyboard('{Tab}')

      await expect.element(gapY()).toHaveFocus()
      expect(shell.gap()).toEqual(gapWithX('3mm'))
    })

    it('closes on Esc, keeping focus and text, the design unchanged', async () => {
      const shell = await arrange({ parameters: wallAndKs })
      await retype('wa')
      await expect.element(list()).toBeVisible()

      await userEvent.keyboard('{Escape}')

      await expect.element(list()).not.toBeInTheDocument()
      await expect.element(gapX()).toHaveFocus()
      await expect.element(gapX()).toHaveValue('wa')
      expect(shell.gap()).toEqual(ARRANGED_GAP)
    })

    it('leaves the field for the canvas on a second Esc, dropping the unapplied text', async () => {
      await arrange({ parameters: wallAndKs })
      await retype('wa')
      await expect.element(list()).toBeVisible()
      await userEvent.keyboard('{Escape}')
      await expect.element(list()).not.toBeInTheDocument()

      await userEvent.keyboard('{Escape}')

      await expectLeftForCanvasWith('1mm')
    })
  })

  describe('Esc with the list closed, leaving the field for the canvas', () => {
    it("drops text the pause has not applied, showing the design's, with nothing to undo", async () => {
      const shell = await arrange()
      await retype('5mm')
      shell.advance(PAUSE_MS - 1)

      await userEvent.keyboard('{Escape}')
      shell.advance(1)

      await expectLeftForCanvasWith('1mm')
      expect(shell.undoneGaps()).toEqual([])
    })

    it('keeps what the pause applied, as one undo entry', async () => {
      const shell = await arrange()
      await retype('5mm')
      shell.advance(PAUSE_MS)

      await userEvent.keyboard('{Escape}')

      await expectLeftForCanvasWith('5mm')
      expect(shell.undoneGaps()).toEqual([ARRANGED_GAP])
    })

    it('drops invalid text and its error', async () => {
      const shell = await arrange()
      await retype('5deg')
      shell.advance(PAUSE_MS)
      await expectInvalid(NOT_MM)

      await userEvent.keyboard('{Escape}')

      await expectLeftForCanvasWith('1mm')
      expect(shell.gap()).toEqual(ARRANGED_GAP)
    })
  })
})
