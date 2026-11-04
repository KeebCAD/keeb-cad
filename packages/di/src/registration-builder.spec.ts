import { describe, expect, it } from 'vitest'

import { Lifetime } from './lifetime'
import { RegistrationBuilder } from './registration-builder'

import type { RegistrationEntry } from './types'

const DEFAULT_ENTRY = { factory: expect.any(Function), lifetime: Lifetime.Container, eager: false }

function captureEntries<T>(): {
  entries: RegistrationEntry<T>[]
  onChange: (entry: RegistrationEntry<T>) => void
} {
  const entries: RegistrationEntry<T>[] = []
  return { entries, onChange: (entry) => entries.push(entry) }
}

const built = <T>(entries: readonly RegistrationEntry<T>[]) =>
  entries.map((entry) => entry.factory())

describe('RegistrationBuilder', () => {
  describe('useClass', () => {
    it('emits an entry whose factory builds an instance of the given class', () => {
      class Foo {
        hello = 'hi'
      }
      const { entries, onChange } = captureEntries<Foo>()
      new RegistrationBuilder<Foo>(onChange).useClass(Foo)
      expect(built(entries)).toStrictEqual([new Foo()])
    })
  })

  describe('useFactory', () => {
    it('emits an entry whose factory returns what useFactory provided', () => {
      const { entries, onChange } = captureEntries<number>()
      new RegistrationBuilder<number>(onChange).useFactory(() => 42)
      expect(built(entries)).toEqual([42])
    })
  })

  describe('useValue', () => {
    it('emits an entry whose factory returns the literal given to useValue', () => {
      const v = { id: 7 }
      const { entries, onChange } = captureEntries<typeof v>()
      new RegistrationBuilder<typeof v>(onChange).useValue(v)
      expect(built(entries)).toEqual([v])
    })
  })

  describe('defaults', () => {
    it('emits one lazy Container-lifetime entry', () => {
      const { entries, onChange } = captureEntries<string>()
      new RegistrationBuilder<string>(onChange).useValue('x')
      expect(entries).toEqual([DEFAULT_ENTRY])
    })
  })
})

describe('RegistrationOptions', () => {
  describe('lifetime', () => {
    it('re-emits with the new lifetime', () => {
      const { entries, onChange } = captureEntries<string>()
      new RegistrationBuilder<string>(onChange).useValue('x').lifetime(Lifetime.Transient)
      expect(entries).toEqual([DEFAULT_ENTRY, { ...DEFAULT_ENTRY, lifetime: Lifetime.Transient }])
    })
  })

  describe('eager', () => {
    it('re-emits with eager=true', () => {
      const { entries, onChange } = captureEntries<string>()
      new RegistrationBuilder<string>(onChange).useValue('x').eager()
      expect(entries).toEqual([DEFAULT_ENTRY, { ...DEFAULT_ENTRY, eager: true }])
    })
  })
})
