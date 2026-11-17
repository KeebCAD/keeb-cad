import { Option } from '@keeb-cad/result'
import { aFreeGroup, aLayout, anId, aSlot } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { nodeAtPath, nodePaths } from './node-at-path'

const OFFSET_X = ['offset', 'position', 'x']

function arrange() {
  return nodePaths(
    aLayout({
      children: [
        aFreeGroup({
          id: anId('g'),
          children: [aSlot({ id: anId('j') }), aSlot({ id: anId('k') })],
        }),
      ],
    }),
  )
}

describe('nodeAtPath', () => {
  it.each([
    [
      'a field of a slot inside a group, owned by the slot',
      ['layout', 'children', 0, 'children', 1, ...OFFSET_X],
      Option.some({ id: anId('k'), at: 5 }),
    ],
    [
      "a group's own field, owned by the group",
      ['layout', 'children', 0, ...OFFSET_X],
      Option.some({ id: anId('g'), at: 3 }),
    ],
    ['a path outside the layout, owned by no node', ['meta', 'gap', 'x'], Option.none()],
  ])('finds %s', (_role, path, expected) => {
    expect(nodeAtPath(arrange(), path)).toEqual(expected)
  })
})
