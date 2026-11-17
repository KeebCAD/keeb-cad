import { anId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { parameterInUseMessage } from './parameter-in-use-message'

describe('parameterInUseMessage', () => {
  it.each([
    ['one user', ['a'], 'The parameter "x" is used by "a".'],
    ['several users, in the given order', ['a', 'b'], 'The parameter "x" is used by "a", "b".'],
  ])('names the parameter and %s', (_role, users, expected) => {
    expect(
      parameterInUseMessage(
        'x',
        users.map((id) => anId(id)),
      ),
    ).toBe(expected)
  })
})
