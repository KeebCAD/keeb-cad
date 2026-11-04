import { describe, expect, it } from 'vitest'

import { Container } from './container'
import { ScopedResolutionOutsideScopeError } from './errors/scoped-resolution-outside-scope-error'
import { inject } from './inject'
import { InjectorToken } from './injector-token'
import { Lifetime } from './lifetime'
import { createMultiToken, createToken } from './token'

import type { Injector } from './types'

describe('InjectorToken', () => {
  it('resolves to an Injector that can resolve other tokens', () => {
    const c = new Container()
    const t = createToken<string>('X')
    c.register(t).useValue('v')
    const inj = c.resolve(InjectorToken)
    expect(inj.resolve(t)).toBe('v')
  })

  it('resolves multi-tokens through the Injector', () => {
    const c = new Container()
    const t = createMultiToken<string>('M')
    c.register(t).useValue('a')
    c.register(t).useValue('b')
    const inj = c.resolve(InjectorToken)
    expect(inj.resolve(t)).toEqual(['a', 'b'])
  })

  it('from a scope resolves Scoped bindings', () => {
    class Scoped {
      readonly kind = 'scoped'
    }
    const c = new Container()
    c.register(Scoped).useClass(Scoped).lifetime(Lifetime.Scoped)
    const scope = c.createScope()
    const inj = scope.resolve(InjectorToken)
    const first = inj.resolve(Scoped)
    expect(inj.resolve(Scoped)).toBe(first)
  })

  it('from the root container forwards the Scoped error', () => {
    class Scoped {
      readonly kind = 'scoped'
    }
    const c = new Container()
    c.register(Scoped).useClass(Scoped).lifetime(Lifetime.Scoped)
    expect(() => c.resolve(InjectorToken).resolve(Scoped)).toThrow(
      new ScopedResolutionOutsideScopeError(Scoped),
    )
  })

  it('is injectable into other factories', () => {
    class Owner {
      readonly inj: Injector = inject(InjectorToken)
    }
    const c = new Container()
    const t = createToken<string>('X')
    c.register(t).useValue('v')
    c.register(Owner).useClass(Owner)
    expect(c.resolve(Owner).inj.resolve(t)).toBe('v')
  })
})
