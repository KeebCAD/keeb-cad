import { describe, expect, it } from 'vitest'

import { toStorageError } from './to-storage-error'

const securityError = { name: 'SecurityError', message: 'The operation is insecure.' }
const quotaError = { name: 'QuotaExceededError', message: 'The quota has been exceeded.' }
const abortError = { name: 'AbortError', message: 'The transaction was aborted.' }
const unknownError = { name: 'UnknownError', message: 'The database is blocked.' }

describe('toStorageError', () => {
  it.each([
    ['a QuotaExceededError', quotaError],
    ['an AbortError whose inner is a QuotaExceededError', { ...abortError, inner: quotaError }],
  ])('maps %s to quota-exceeded', (_role, caught) => {
    expect(toStorageError(caught)).toEqual({ kind: 'quota-exceeded' })
  })

  it.each([
    ['a raw SecurityError, from itself', securityError],
    [
      'an OpenFailedError with a SecurityError inner, from the inner',
      {
        name: 'OpenFailedError',
        message: 'SecurityError The operation is insecure.',
        inner: securityError,
      },
    ],
    [
      'a DatabaseClosedError with a SecurityError inner, from the inner',
      {
        name: 'DatabaseClosedError',
        message: 'SecurityError The operation is insecure.',
        inner: securityError,
      },
    ],
  ])('maps %s to storage-unavailable naming the SecurityError', (_role, caught) => {
    expect(toStorageError(caught)).toEqual({
      kind: 'storage-unavailable',
      message: 'SecurityError: The operation is insecure.',
    })
  })

  it.each([
    [
      'an AbortError with an UnknownError inner, from the inner',
      { ...abortError, inner: unknownError },
    ],
    ['an UnknownError with no inner, from itself', unknownError],
  ])('maps %s to storage-unavailable naming the UnknownError', (_role, caught) => {
    expect(toStorageError(caught)).toEqual({
      kind: 'storage-unavailable',
      message: 'UnknownError: The database is blocked.',
    })
  })

  it('maps an AbortError with no inner to storage-unavailable naming the AbortError', () => {
    expect(toStorageError(abortError)).toEqual({
      kind: 'storage-unavailable',
      message: 'AbortError: The transaction was aborted.',
    })
  })
})
