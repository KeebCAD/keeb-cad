import type { Rejection } from '@keeb-cad/schema'
import { anId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { rejectionText } from './rejection-text'

describe('rejectionText', () => {
  it("gives a model kind's own message", () => {
    expect(rejectionText({ kind: 'id-taken', ids: [anId('thumb')], message: 'm' })).toBe('m')
  })

  it("gives an input-invalid's first issue's message", () => {
    const rejection: Rejection = {
      kind: 'input-invalid',
      command: 'layout.addSlot',
      issues: [
        { path: ['id'], message: 'An id is required.' },
        { path: ['id'], message: 'An id is kebab-case.' },
      ],
    }

    expect(rejectionText(rejection)).toBe('An id is required.')
  })

  it.each<[string, Rejection, string]>([
    ['unavailable', { kind: 'unavailable', command: 'layout.addSlot' }, 'Not available right now.'],
    ['unknown-command', { kind: 'unknown-command', command: 'layout.nope' }, 'No such command.'],
    ['stale', { kind: 'stale', seq: 1, latest: 2 }, 'The design changed; try again.'],
  ])('words the store kind %s', (_kind, rejection, expected) => {
    expect(rejectionText(rejection)).toBe(expected)
  })
})
