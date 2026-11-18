import { parameterValues } from '@keeb-cad/model/main'
import type { Parameter } from '@keeb-cad/schema'
import { anExpression, aParameter, aParameterName } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { parameterOptions } from './parameter-options'

// 1e200 mm × 1e200 evaluates to an infinite length.
const OVERFLOWING = `1${'0'.repeat(200)}mm * 1${'0'.repeat(200)}`

const parameter = (name: string, value: string) =>
  aParameter({ name: aParameterName(name), value: anExpression(value) })

function optionsFor(parameters: Parameter[], typed: string | undefined) {
  return parameterOptions(parameters, parameterValues(parameters), typed)
}

describe('parameterOptions', () => {
  it('labels each name the typed name starts, in design order, with its value or its name alone when it failed', () => {
    const parameters = [
      parameter('wall', '2mm'),
      parameter('ks', '19mm'),
      parameter('wide', 'wall + 0.374mm'),
      parameter('wx', 'wx'),
    ]

    expect(optionsFor(parameters, 'w')).toEqual([
      { value: 'wall', label: 'wall = 2 mm' },
      { value: 'wide', label: 'wide ≈ 2.37 mm' },
      { value: 'wx', label: 'wx' },
    ])
  })

  it('labels a parameter that overflows to a non-finite value by its name alone', () => {
    expect(optionsFor([parameter('big', OVERFLOWING)], 'b')).toEqual([
      { value: 'big', label: 'big' },
    ])
  })

  it('matches a name by its case', () => {
    expect(optionsFor([parameter('Wall', '2mm')], 'w')).toEqual([])
  })

  it('offers a name a later parameter repeats once', () => {
    expect(optionsFor([parameter('wall', '2mm'), parameter('wall', '3mm')], 'wa')).toEqual([
      { value: 'wall', label: 'wall = 2 mm' },
    ])
  })

  it('offers nothing when no name is being typed', () => {
    expect(optionsFor([parameter('wall', '2mm')], undefined)).toEqual([])
  })
})
