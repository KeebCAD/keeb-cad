import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { h, shallowRef } from 'vue'

import { treeStates } from '../../workbench/states/tree-states'
import type { TreeRow } from './types'
import UiTree from './UiTree.vue'

const ROWS: TreeRow[] = [
  {
    id: 'outer',
    label: 'outer',
    kind: 'group',
    children: [
      { id: 'outer-bottom', label: 'outer-bottom', kind: 'slot', children: [] },
      { id: 'outer-home', label: 'outer-home', kind: 'slot', children: [] },
    ],
  },
]

async function arrange(initial: readonly string[] = []) {
  const selected = shallowRef(initial)
  const screen = await render({
    render: () =>
      h(UiTree, {
        label: 'Tree',
        rows: ROWS,
        selected: selected.value,
        'onUpdate:selected': (ids: readonly string[]) => {
          selected.value = ids
        },
      }),
  })
  const row = (name: string) => screen.getByRole('treeitem', { name, exact: true })
  return { screen, selected, row }
}

describe('Tree', () => {
  it.each(treeStates)('renders the $name state as a tree named Tree', async (state) => {
    const screen = await render(UiTree, { props: state.props })

    await expect.element(screen.getByRole('tree', { name: 'Tree' })).toBeInTheDocument()
  })

  it('selects a clicked row by its id and marks it aria-selected', async () => {
    const { selected, row } = await arrange()

    await row('outer-home').click()

    expect(selected.value).toEqual(['outer-home'])
    await expect.element(row('outer-home')).toHaveAttribute('aria-selected', 'true')
  })

  it('keeps a selected row selected when it is clicked again', async () => {
    const { selected, row } = await arrange(['outer-home'])

    await row('outer-home').click()

    expect(selected.value).toEqual(['outer-home'])
  })

  it('marks the row the model selects aria-selected and the others not', async () => {
    const { row } = await arrange(['outer-bottom'])

    await expect.element(row('outer-bottom')).toHaveAttribute('aria-selected', 'true')
    await expect.element(row('outer-home')).toHaveAttribute('aria-selected', 'false')
  })

  it('emits hover with the row the pointer enters, then leave once it leaves the tree', async () => {
    const row: TreeRow = { id: 'x', label: 'x', kind: 'slot', children: [] }
    const events: unknown[] = []
    const screen = await render(UiTree, {
      props: {
        label: 'Tree',
        rows: [row],
        selected: [],
        onHover: (hovered: TreeRow) => events.push(['hover', hovered]),
        onLeave: () => events.push(['leave']),
      },
    })

    await userEvent.hover(screen.getByRole('treeitem', { name: 'x', exact: true }))
    await userEvent.unhover(screen.getByRole('tree', { name: 'Tree' }))

    expect(events).toEqual([['hover', row], ['leave']])
  })

  it('moves focus to the next row on the down arrow', async () => {
    const { row } = await arrange()
    row('outer-bottom').element().focus()

    await userEvent.keyboard('{ArrowDown}')

    await expect.element(row('outer-home')).toHaveFocus()
  })

  it('moves focus to the previous row on the up arrow', async () => {
    const { row } = await arrange()
    row('outer-home').element().focus()

    await userEvent.keyboard('{ArrowUp}')

    await expect.element(row('outer-bottom')).toHaveFocus()
  })
})
