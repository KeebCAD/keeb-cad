import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { designSchema } from './design'
import { aMeta } from './testing'

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

    expect(issuePaths({ meta: aMeta(), layout })).toEqual([])
  })

  it('refuses a chain group without an axis, at the axis', () => {
    const layout = { id: 'root', arrangement: 'chain', children: [] }

    expect(issuePaths({ meta: aMeta(), layout })).toEqual([['layout', 'axis']])
  })

  it('refuses a child group without children, at its children', () => {
    const layout = {
      id: 'root',
      arrangement: 'free',
      children: [{ id: 'thumbs', arrangement: 'free' }],
    }

    expect(issuePaths({ meta: aMeta(), layout })).toEqual([['layout', 'children', 0, 'children']])
  })
})
