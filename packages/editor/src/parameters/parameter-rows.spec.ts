import { anExpression, aParameter, aParameterName } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { parameterRows } from './parameter-rows'

const parameter = (name: string, value: string) =>
  aParameter({ name: aParameterName(name), value: anExpression(value) })

describe('parameterRows', () => {
  it('makes the first parameter of a name editable and a later one repeating it read-only, with its value', () => {
    const first = parameter('wall', '1mm')
    const later = parameter('wall', 'wall * 2')

    expect(parameterRows([first, later])).toEqual([
      { parameter: first },
      { parameter: later, readOnlyText: 'wall = wall * 2 = 2 mm' },
    ])
  })

  it.each([
    ['a plain literal, which already reads as its value', '2mm', 'wall = 2mm'],
    ['a value that fails to evaluate', 'nope', 'wall = nope'],
  ])('shows a repeated name holding %s as its expression alone', (_role, value, expected) => {
    const later = parameter('wall', value)

    expect(parameterRows([parameter('wall', '1mm'), later])).toEqual([
      { parameter: parameter('wall', '1mm') },
      { parameter: later, readOnlyText: expected },
    ])
  })

  it('makes every later parameter of three sharing a name read-only', () => {
    const parameters = [
      parameter('wall', '1mm'),
      parameter('wall', '2mm'),
      parameter('wall', '3mm'),
    ]

    expect(parameterRows(parameters)).toEqual([
      { parameter: parameters[0] },
      { parameter: parameters[1], readOnlyText: 'wall = 2mm' },
      { parameter: parameters[2], readOnlyText: 'wall = 3mm' },
    ])
  })
})
