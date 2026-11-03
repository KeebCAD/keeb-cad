// Generic type helpers: plain TypeScript with no schema and no Immer (AD-2, AD-24).

/** Every expected-failure boundary returns one. */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

type Primitive = string | number | boolean | bigint | symbol | null | undefined

/** Deep readonly: every design value outside an apply step (AD-2). */
export type Frozen<T> = T extends Primitive
  ? T
  : T extends (...arguments_: never[]) => unknown
    ? T
    : T extends readonly (infer U)[]
      ? readonly Frozen<U>[]
      : T extends object
        ? { readonly [K in keyof T]: Frozen<T[K]> }
        : T

/** The inverse of `Frozen`: domain operations take `Mutable<Design>` (AD-2). */
export type Mutable<T> = T extends Primitive
  ? T
  : T extends (...arguments_: never[]) => unknown
    ? T
    : T extends readonly (infer U)[]
      ? Mutable<U>[]
      : T extends object
        ? { -readonly [K in keyof T]: Mutable<T[K]> }
        : T
