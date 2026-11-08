import type { Result } from '@keeb-cad/result'

// Err is iterable, so toEqual cannot compare Results directly.
export const outcomeOf = <T, E>(result: Result<T, E>) =>
  result.match<{ ok: T } | { err: E }>({
    ok: (ok) => ({ ok }),
    err: (err) => ({ err }),
  })

export const okOf = <T>(ok: T) => ({ ok })
export const errOf = <E>(err: E) => ({ err })
