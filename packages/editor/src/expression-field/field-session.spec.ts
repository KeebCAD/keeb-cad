import { describe, expect, it } from 'vitest'

import { FieldSession } from './field-session'

describe('FieldSession', () => {
  it('has no key before a session begins', () => {
    expect(new FieldSession().key).toBeUndefined()
  })

  it('mints a new key for each session and drops it when the session ends', () => {
    const session = new FieldSession()

    session.begin()
    const first = session.key
    session.end()
    const ended = session.key
    session.begin()

    expect({ first: typeof first, ended, differs: session.key !== first }).toEqual({
      first: 'string',
      ended: undefined,
      differs: true,
    })
  })
})
