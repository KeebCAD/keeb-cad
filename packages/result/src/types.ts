// attempt's runner reads the error off each yielded carrier, so the error channel widens across
// yield* sites.
export interface ErrYield<E> {
  readonly kind: 'err'
  readonly error: E
}

// `Y['error']` distributes over the union of yielded ErrYield carriers.
export type SyncGen<T, Y extends ErrYield<unknown>> = Generator<Y, T, unknown>
export type AsyncGen<T, Y extends ErrYield<unknown>> = AsyncGenerator<Y, T, unknown>
