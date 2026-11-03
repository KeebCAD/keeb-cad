import { AsyncResult } from './async-result'
import { Err } from './err'
import { Ok } from './ok'
import type { Result } from './result'
import type { AsyncGen, ErrYield, SyncGen } from './types'

function runSync<T, Y extends ErrYield<unknown>>(iter: SyncGen<T, Y>): Result<T, Y['error']> {
  const next = iter.next()
  return next.done ? new Ok<T, Y['error']>(next.value) : new Err<T, Y['error']>(next.value.error)
}

async function runAsync<T, Y extends ErrYield<unknown>>(
  iter: AsyncGen<T, Y>,
): Promise<Result<T, Y['error']>> {
  const next = await iter.next()
  return next.done ? new Ok<T, Y['error']>(next.value) : new Err<T, Y['error']>(next.value.error)
}

function isAsyncGenerator(value: object): value is AsyncGen<unknown, ErrYield<unknown>> {
  return typeof (value as Partial<AsyncIterable<unknown>>)[Symbol.asyncIterator] === 'function'
}

function dispatch<T, Y extends ErrYield<unknown>>(
  iter: SyncGen<T, Y> | AsyncGen<T, Y>,
): Result<T, Y['error']> | AsyncResult<T, Y['error']> {
  return isAsyncGenerator(iter) ? AsyncResult._fromPromiseOfResult(runAsync(iter)) : runSync(iter)
}

function attemptCall<T, Y extends ErrYield<unknown>>(fn: () => SyncGen<T, Y>): Result<T, Y['error']>
function attemptCall<T, Y extends ErrYield<unknown>>(
  fn: () => AsyncGen<T, Y>,
): AsyncResult<T, Y['error']>
function attemptCall<T, Y extends ErrYield<unknown>>(
  fn: () => SyncGen<T, Y> | AsyncGen<T, Y>,
): Result<T, Y['error']> | AsyncResult<T, Y['error']> {
  return dispatch(fn())
}

function attemptIn<This, T, Y extends ErrYield<unknown>>(
  self: This,
  fn: (this: This) => SyncGen<T, Y>,
): Result<T, Y['error']>
function attemptIn<This, T, Y extends ErrYield<unknown>>(
  self: This,
  fn: (this: This) => AsyncGen<T, Y>,
): AsyncResult<T, Y['error']>
function attemptIn<This, T, Y extends ErrYield<unknown>>(
  self: This,
  fn: (this: This) => SyncGen<T, Y> | AsyncGen<T, Y>,
): Result<T, Y['error']> | AsyncResult<T, Y['error']> {
  return dispatch(fn.call(self))
}

export const attempt = Object.assign(attemptCall, { in: attemptIn })
