import { anExpression, aParameter, aParameterName } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { parameterDependencies } from './parameter-dependencies'

const parameter = (name: string, value: string) =>
  aParameter({ name: aParameterName(name), value: anExpression(value) })

describe('parameterDependencies', () => {
  it('gives each parameter the names its value reads, once each, in reading order', () => {
    const parameters = [parameter('a', 'b + c * b'), parameter('b', '1mm'), parameter('c', 'nope')]

    expect(parameterDependencies(parameters)).toEqual(
      new Map([
        ['a', ['b', 'c']],
        ['b', []],
        ['c', ['nope']],
      ]),
    )
  })

  it('takes the first of two parameters with one name, ignoring the later', () => {
    const parameters = [parameter('a', '1mm'), parameter('a', 'b')]

    expect(parameterDependencies(parameters)).toEqual(new Map([['a', []]]))
  })
})
