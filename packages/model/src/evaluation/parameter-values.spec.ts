import { anExpression, aParameter, aParameterName } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { parameterValues } from './parameter-values'

const parameter = (name: string, value: string) =>
  aParameter({ name: aParameterName(name), value: anExpression(value) })

describe('parameterValues', () => {
  it('gives each evaluated parameter its value and leaves a failed one out', () => {
    const values = parameterValues([
      parameter('a', '2mm'),
      parameter('b', 'a * 2'),
      parameter('c', 'c'),
    ])

    expect(Object.fromEntries(values)).toEqual({
      a: { value: 2, unit: 'mm' },
      b: { value: 4, unit: 'mm' },
    })
  })

  it('gives nothing for no parameters', () => {
    expect(parameterValues([])).toEqual(new Map())
  })
})
