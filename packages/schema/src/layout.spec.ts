import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { designSchema } from './design'
import { aDesign } from './testing'

function issuePaths(value: unknown): unknown[][] {
  const result = v.safeParse(designSchema, value)
  return (result.issues ?? []).map((issue) => (issue.path ?? []).map((item) => item.key))
}

describe('the layout tree', () => {
  it('accepts a chain and a free group holding groups and slots', () => {
    const layout = {
      id: 'root',
      arrangement: 'free',
      children: [
        {
          id: 'thumbs',
          arrangement: 'chain',
          axis: 'x',
          children: [{ id: 'thumb-far' }, { id: 'cluster', arrangement: 'free', children: [] }],
        },
        { id: 'pinky' },
      ],
    }

    expect(issuePaths({ ...aDesign(), layout })).toEqual([])
  })

  it('refuses a chain group without an axis, at the axis', () => {
    const layout = { id: 'root', arrangement: 'chain', children: [] }

    expect(issuePaths({ ...aDesign(), layout })).toEqual([['layout', 'axis']])
  })

  it('refuses a child group without children, at its children', () => {
    const layout = {
      id: 'root',
      arrangement: 'free',
      children: [{ id: 'thumbs', arrangement: 'free' }],
    }

    expect(issuePaths({ ...aDesign(), layout })).toEqual([['layout', 'children', 0, 'children']])
  })

  it.each([
    ["a free group's slot", { id: 'n', anchor: { type: 'slot', ref: 'a' } }],
    [
      "a free group's child group",
      { id: 'n', arrangement: 'free', children: [], anchor: { type: 'slot', ref: 'a' } },
    ],
  ])('accepts an anchor on %s', (_role, child) => {
    const layout = { id: 'root', arrangement: 'free', children: [chainOrFree('free', child)] }

    expect(issuePaths({ ...aDesign(), layout })).toEqual([])
  })

  it.each([
    ["a chain group's slot", { id: 'n', anchor: { type: 'slot', ref: 'a' } }],
    [
      "a chain group's child group",
      { id: 'n', arrangement: 'free', children: [], anchor: { type: 'slot', ref: 'a' } },
    ],
  ])('refuses an anchor on %s, at its anchor', (_role, child) => {
    const layout = { id: 'root', arrangement: 'free', children: [chainOrFree('chain', child)] }

    expect(issuePaths({ ...aDesign(), layout })).toEqual([
      ['layout', 'children', 0, 'children', 1, 'anchor'],
    ])
  })
})

function chainOrFree(arrangement: 'chain' | 'free', child: object) {
  const group = { id: 'g', children: [{ id: 'a' }, child] }
  return arrangement === 'chain' ? { ...group, arrangement, axis: 'y' } : { ...group, arrangement }
}
