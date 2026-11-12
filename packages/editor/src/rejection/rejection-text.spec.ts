import type { Rejection } from '@keeb-cad/schema'
import { aFormatVersion, anId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { rejectionText } from './rejection-text'
import type { ActionFailure } from './types'

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

  it("gives a design-invalid's first issue's message", () => {
    const failure: ActionFailure = {
      kind: 'design-invalid',
      issues: [
        { path: ['meta', 'id'], message: 'An id is kebab-case.' },
        { path: ['meta', 'name'], message: 'A name is required.' },
      ],
    }

    expect(rejectionText(failure)).toBe('An id is kebab-case.')
  })

  it.each<[string, ActionFailure]>([
    ['migration-failed', { kind: 'migration-failed', from: aFormatVersion(), message: 'm' }],
    ['file-unreadable', { kind: 'file-unreadable', file: 'design', message: 'm' }],
    ['storage-unavailable', { kind: 'storage-unavailable', message: 'm' }],
  ])("gives the action failure %s's own message", (_kind, failure) => {
    expect(rejectionText(failure)).toBe('m')
  })

  it.each<[string, ActionFailure, string]>([
    [
      'format-too-new',
      { kind: 'format-too-new', found: 9 },
      'This design was saved by a newer keeb-cad.',
    ],
    ['not-found', { kind: 'not-found', id: anId('corne') }, 'No stored design has the id corne.'],
    [
      'quota-exceeded',
      { kind: 'quota-exceeded' },
      "The browser's storage is full; free some space and try again.",
    ],
  ])('words the action failure %s', (_kind, failure, expected) => {
    expect(rejectionText(failure)).toBe(expected)
  })
})
