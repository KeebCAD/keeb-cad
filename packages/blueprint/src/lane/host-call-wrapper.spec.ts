import { describe, expect, it } from 'vitest'

import { HandleTable } from './handle-table'
import { HostCallWrapper } from './host-call-wrapper'
import { errOf, okOf, outcomeOf } from '../testing/outcome'

describe('HostCallWrapper', () => {
  it('returns an operation result as one JSON string', () => {
    const wrapper = new HostCallWrapper(
      { add: ([a, b]) => ({ sum: Number(a) + Number(b) }) },
      new HandleTable(),
    )
    expect(outcomeOf(wrapper.call('add', '[1,2]'))).toEqual(okOf('{"sum":3}'))
  })

  it('answers null for an operation with no result', () => {
    const wrapper = new HostCallWrapper({ nop() {} }, new HandleTable())
    expect(outcomeOf(wrapper.call('nop', '[]'))).toEqual(okOf('null'))
  })

  it('turns a host error into its message alone', () => {
    const wrapper = new HostCallWrapper(
      {
        bad: () => {
          throw new Error('no shape 42')
        },
      },
      new HandleTable(),
    )
    expect(outcomeOf(wrapper.call('bad', '[]'))).toEqual(errOf('no shape 42'))
  })

  it.each(['missing', 'constructor', '__proto__'])('refuses %s, an unknown operation', (name) => {
    const wrapper = new HostCallWrapper({}, new HandleTable())
    expect(outcomeOf(wrapper.call(name, '[]'))).toEqual(errOf(`no operation named ${name}`))
  })
})
