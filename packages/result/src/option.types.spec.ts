import { describe, expectTypeOf, it } from 'vitest'

import type { None } from './none'
import { Option } from './option'
import type { Some } from './some'

import type { Result } from './result'

describe('Option', () => {
  describe('type narrowing', () => {
    it('isSome narrows to Some<T>', () => {
      const opt: Option<number> = Option.some(1)
      expectTypeOf([opt].filter((o) => o.isSome())).toEqualTypeOf<Some<number>[]>()
    })

    it('isNone narrows to None<T>', () => {
      const opt: Option<number> = Option.none()
      expectTypeOf([opt].filter((o) => o.isNone())).toEqualTypeOf<None<number>[]>()
    })
  })

  describe('okOr / okOrElse', () => {
    it('okOr is typed Result<T, E>', () => {
      const r = Option.some(5).okOr(new Error('x'))
      expectTypeOf(r).toEqualTypeOf<Result<number, Error>>()
    })
  })
})
