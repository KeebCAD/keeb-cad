import { DesignStore } from '@keeb-cad/design'
import { findNode } from '@keeb-cad/model/main'
import type { Node, PlacementId } from '@keeb-cad/schema'
import {
  aChainGroup,
  aDelta,
  aDesign,
  aFreeGroup,
  aLayout,
  anAngle,
  anId,
  anOffset,
  aPlacementId,
  aSlot,
  aSlotAnchor,
  aVec2,
} from '@keeb-cad/schema/testing'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { Selection } from '../../../selection/selection'
import { canvas } from '../../../testing/canvas-queries'
import { mountShell } from '../../../testing/mount-shell'

const PAUSE_MS = 300
const NOT_MM = 'Not a quantity in mm.'
const A = anId('a')
const B = anId('b')
const C = anId('c')
const G = anId('g')
const H = anId('h')
const K = anId('k')
const S = anId('s')

const inspector = () => page.getByRole('complementary', { name: 'Inspector' })
const section = (name: string) => inspector().getByRole('region', { name })
const field = (name: string) => inspector().getByRole('combobox', { name, exact: true })
const anchorRow = () => section('Anchor').getByRole('definition')
const arrangement = () => inspector().getByRole('radiogroup', { name: 'arrangement' })
const option = (name: string) => arrangement().getByRole('radio', { name, exact: true })
const checkedOptions = () =>
  arrangement()
    .getByRole('radio')
    .elements()
    .filter((radio) => radio.getAttribute('aria-checked') === 'true')
    .map((radio) => radio.textContent.replace('✓', '').trim())

const refusal = () => section('Chain').getByText(/form a loop/)

const left = (id: string) => aPlacementId(`left/${id}`)
const atX = (x: string) => anOffset({ position: aVec2({ x: aDelta(x), y: aDelta('0mm') }) })

// Free g holds k, which is anchored to s outside it, and g is anchored to k: chaining g would
// make k fall back onto g.
const looping = () => [
  aSlot({ id: S }),
  aFreeGroup({
    id: G,
    anchor: aSlotAnchor({ ref: K }),
    children: [aSlot({ id: K, anchor: aSlotAnchor({ ref: S }) })],
  }),
]

async function arrange({ children, selected }: Arrangement) {
  const design = aDesign({ layout: aLayout({ id: anId('root'), children }) })
  const shell = await mountShell({ path: '/design/corne/layout', design })
  const store = shell.injector.resolve(DesignStore)
  const selection = shell.injector.resolve(Selection)
  selection.select(selected)
  const current = () => {
    const committed = store.current.getOrUndefined()
    if (committed === undefined) throw new Error('No design is open.')
    return committed.design
  }
  return {
    selection,
    design: current,
    node: (id: string) => findNode(current().layout, id)?.node,
    // How many undo entries the history holds, undoing every one.
    undoAll: () => {
      let count = 0
      while (store.undo().isOk()) count += 1
      return count
    },
  }
}

type Arrangement = { children: Node[]; selected: readonly PlacementId[] }

function freezeTime() {
  vi.useFakeTimers()
  onTestFinished(() => {
    vi.useRealTimers()
  })
  return (milliseconds: number) => {
    vi.advanceTimersByTime(milliseconds)
  }
}

describe('the node inspector', () => {
  describe('which sections show', () => {
    it('shows Design settings and no node sections while nothing is selected', async () => {
      await arrange({ children: [aSlot({ id: A })], selected: [] })

      await expect.element(section('Design settings')).toBeVisible()
      await expect.element(section('Offset')).not.toBeInTheDocument()
    })

    it('shows the node sections for a selected slot, and no Design settings', async () => {
      await arrange({ children: [aSlot({ id: A })], selected: [left(A)] })

      await expect.element(section('Anchor')).toBeVisible()
      await expect.element(section('Offset')).toBeVisible()
      await expect.element(section('Design settings')).not.toBeInTheDocument()
    })

    it('shows neither node sections nor Design settings for a right id', async () => {
      await arrange({ children: [aSlot({ id: A })], selected: [aPlacementId('right/a')] })

      await expect.element(inspector()).toBeInTheDocument()
      await expect.element(section('Anchor')).not.toBeInTheDocument()
      await expect.element(section('Offset')).not.toBeInTheDocument()
      await expect.element(section('Design settings')).not.toBeInTheDocument()
    })

    it('shows no Chain section for a group and a slot', async () => {
      await arrange({
        children: [aFreeGroup({ id: G }), aSlot({ id: A })],
        selected: [left(G), left(A)],
      })

      await expect.element(section('Offset')).toBeVisible()
      await expect.element(section('Chain')).not.toBeInTheDocument()
    })

    it('shows the pivot fields for a group', async () => {
      await arrange({ children: [aFreeGroup({ id: G })], selected: [left(G)] })

      await expect.element(field('pivot x')).toBeVisible()
      await expect.element(field('pivot y')).toBeVisible()
    })

    it.each([
      ['a slot', [A]],
      ['a group and a slot', [G, A]],
    ])('shows no pivot fields for %s', async (_role, selected) => {
      await arrange({
        children: [aFreeGroup({ id: G }), aSlot({ id: A })],
        selected: selected.map(left),
      })

      await expect.element(field('x')).toBeVisible()
      await expect.element(field('pivot x')).not.toBeInTheDocument()
      await expect.element(field('pivot y')).not.toBeInTheDocument()
    })
  })

  describe('the Anchor section', () => {
    it('reads mixed for nodes whose anchors differ', async () => {
      await arrange({
        children: [
          aSlot({ id: S }),
          aSlot({ id: A, anchor: aSlotAnchor({ ref: S }) }),
          aSlot({ id: B }),
        ],
        selected: [left(A), left(B)],
      })

      await expect.element(anchorRow()).toHaveTextContent('mixed')
    })
  })

  describe('the Offset section', () => {
    it("shows an unset node's offset as its defaults", async () => {
      await arrange({ children: [aSlot({ id: A })], selected: [left(A)] })

      await expect.element(field('x')).toHaveValue('0mm')
      await expect.element(field('y')).toHaveValue('0mm')
      await expect.element(field('rot')).toHaveValue('0deg')
    })

    it('shows an unset x and an x of 0mm as one value', async () => {
      await arrange({
        children: [aSlot({ id: A }), aSlot({ id: B, offset: atX('0mm') })],
        selected: [left(A), left(B)],
      })

      await expect.element(field('x')).toHaveValue('0mm')
    })

    it('leaves a differing x empty with the placeholder mixed', async () => {
      await arrange({
        children: [aSlot({ id: A, offset: atX('1mm') }), aSlot({ id: B, offset: atX('2mm') })],
        selected: [left(A), left(B)],
      })

      await expect.element(field('x')).toHaveValue('')
      await expect.element(field('x')).toHaveAttribute('placeholder', 'mixed')
    })

    it('keeps the differing x and the mixed placeholder after a mixed field is focused and left untouched', async () => {
      const shell = await arrange({
        children: [aSlot({ id: A, offset: atX('1mm') }), aSlot({ id: B, offset: atX('2mm') })],
        selected: [left(A), left(B)],
      })
      field('x').element().focus()

      canvas().element().focus()

      await expect.element(field('x')).toHaveValue('')
      await expect.element(field('x')).toHaveAttribute('placeholder', 'mixed')
      expect([shell.node(A)?.offset, shell.node(B)?.offset]).toEqual([atX('1mm'), atX('2mm')])
    })

    it("runs setOffset on x with the field's session, so one undo restores no offset", async () => {
      const advance = freezeTime()
      const shell = await arrange({ children: [aChainGroup({ id: C })], selected: [left(C)] })
      await userEvent.fill(field('x'), '5mm')
      advance(PAUSE_MS)
      await userEvent.fill(field('x'), '6mm')

      await userEvent.keyboard('{Enter}')
      const set = shell.node(C)?.offset
      const undone = shell.undoAll()

      expect({ set, undone, offset: shell.node(C)?.offset }).toEqual({
        set: atX('6mm'),
        undone: 1,
        offset: undefined,
      })
    })

    it("runs setOffset on rot and on a group's pivot y", async () => {
      const shell = await arrange({ children: [aFreeGroup({ id: G })], selected: [left(G)] })
      await userEvent.fill(field('rot'), '5deg')
      await userEvent.keyboard('{Enter}')

      await userEvent.fill(field('pivot y'), '2mm')
      await userEvent.keyboard('{Enter}')

      expect(shell.node(G)?.offset).toEqual(
        anOffset({
          rotation: anAngle('5deg'),
          pivot: aVec2({ x: aDelta('0mm'), y: aDelta('2mm') }),
        }),
      )
    })

    it('runs one setOffset over every selected node, one undo restoring both', async () => {
      const shell = await arrange({
        children: [aSlot({ id: A }), aSlot({ id: B })],
        selected: [left(A), left(B)],
      })
      await userEvent.fill(field('x'), '2mm')

      await userEvent.keyboard('{Enter}')
      const set = [shell.node(A)?.offset, shell.node(B)?.offset]
      const undone = shell.undoAll()

      expect({ set, undone, offsets: [shell.node(A)?.offset, shell.node(B)?.offset] }).toEqual({
        set: [atX('2mm'), atX('2mm')],
        undone: 1,
        offsets: [undefined, undefined],
      })
    })

    it('refuses a deg value in x, leaving the design unchanged', async () => {
      const shell = await arrange({ children: [aSlot({ id: A })], selected: [left(A)] })
      const before = shell.design()
      await userEvent.fill(field('x'), '5deg')

      await userEvent.keyboard('{Enter}')

      await expect.element(field('x')).toHaveAttribute('aria-invalid', 'true')
      await expect.element(field('x')).toHaveAccessibleDescription(NOT_MM)
      expect(shell.design()).toBe(before)
    })
  })

  describe('the Chain section', () => {
    it("checks the option a chain's axis gives", async () => {
      await arrange({ children: [aChainGroup({ id: G, axis: 'x' })], selected: [left(G)] })

      await expect.element(option('chain x')).toHaveAttribute('aria-checked', 'true')
      expect(checkedOptions()).toEqual(['chain x'])
    })

    it('checks no option for groups that differ', async () => {
      await arrange({
        children: [aFreeGroup({ id: G }), aChainGroup({ id: H, axis: 'x' })],
        selected: [left(G), left(H)],
      })

      await expect.element(arrangement()).toBeVisible()
      expect(checkedOptions()).toEqual([])
    })

    it('runs setArrangement for a pick, as one undo entry', async () => {
      const shell = await arrange({ children: [aFreeGroup({ id: G })], selected: [left(G)] })

      await option('chain y').click()
      await expect.element(option('chain y')).toHaveAttribute('aria-checked', 'true')
      const set = shell.node(G)
      const undone = shell.undoAll()

      expect({ set, undone }).toEqual({ set: aChainGroup({ id: G, axis: 'y' }), undone: 1 })
    })

    it("leaves a refused pick on the design's value, with the refusal below the control", async () => {
      const shell = await arrange({ children: looping(), selected: [left(G)] })
      const before = shell.design()

      await option('chain x').click()

      await expect.element(refusal()).toBeVisible()
      expect({ checked: checkedOptions(), unchanged: shell.design() === before }).toEqual({
        checked: ['free'],
        unchanged: true,
      })
    })

    it('clears the refusal when the selection changes to another group', async () => {
      const shell = await arrange({
        children: [...looping(), aFreeGroup({ id: H })],
        selected: [left(G)],
      })
      await option('chain x').click()
      await expect.element(refusal()).toBeVisible()

      shell.selection.select([left(H)])

      await expect.element(arrangement()).toBeVisible()
      await expect.element(refusal()).not.toBeInTheDocument()
    })
  })
})
