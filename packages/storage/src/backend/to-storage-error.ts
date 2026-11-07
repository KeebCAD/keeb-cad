import type { SaveError, StorageUnavailable } from '../design-storage/types'
import type { CaughtError } from './types'

// Dexie surfaces one failure as the raw DOMException, or wraps it as `inner`, so the inner names
// the cause when present.
export function toStorageError(caught: CaughtError): SaveError {
  return [caught.name, caught.inner?.name].includes('QuotaExceededError')
    ? { kind: 'quota-exceeded' }
    : toStorageUnavailable(caught)
}

export function toStorageUnavailable(caught: CaughtError): StorageUnavailable {
  const { name, message } = caught.inner ?? caught
  return { kind: 'storage-unavailable', message: `${name}: ${message}` }
}
