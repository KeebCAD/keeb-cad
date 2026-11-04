import { describe, expect, it } from 'vitest'

import { createToken } from '../token'
import { CannotOverrideError } from './cannot-override-error'
import { CircularDependencyError } from './circular-dependency-error'
import { ContainerDisposedError } from './container-disposed-error'
import { DuplicateRegistrationError } from './duplicate-registration-error'
import { InvalidTokenError } from './invalid-token-error'
import { NoInjectionContextError } from './no-injection-context-error'
import { ScopedResolutionOutsideScopeError } from './scoped-resolution-outside-scope-error'
import { TokenNotRegisteredError } from './token-not-registered-error'

describe('TokenNotRegisteredError', () => {
  it('carries the token name and the resolution chain', () => {
    expect(new TokenNotRegisteredError(createToken('Foo'), ['A', 'B'])).toMatchObject({
      name: 'TokenNotRegisteredError',
      tokenName: 'Foo',
      chain: ['A', 'B'],
      message: 'Token "Foo" is not registered. Resolution chain: [A -> B]',
    })
  })
})

describe('DuplicateRegistrationError', () => {
  it('carries the duplicated token name', () => {
    expect(new DuplicateRegistrationError(createToken('Bar'))).toMatchObject({
      name: 'DuplicateRegistrationError',
      tokenName: 'Bar',
      message:
        'Token "Bar" already has a single-binding registration. Use createMultiToken for multi-binding semantics.',
    })
  })
})

describe('CircularDependencyError', () => {
  it('carries the chain showing the cycle', () => {
    expect(new CircularDependencyError(['A', 'B', 'A'])).toMatchObject({
      name: 'CircularDependencyError',
      chain: ['A', 'B', 'A'],
      message: 'Circular dependency detected: A -> B -> A',
    })
  })
})

describe('NoInjectionContextError', () => {
  it('identifies the failing call', () => {
    expect(new NoInjectionContextError('inject(Foo)')).toMatchObject({
      name: 'NoInjectionContextError',
      callsite: 'inject(Foo)',
      message: 'inject(Foo) called outside any active resolution context.',
    })
  })
})

describe('ContainerDisposedError', () => {
  it('constructs without arguments', () => {
    expect(new ContainerDisposedError()).toMatchObject({
      name: 'ContainerDisposedError',
      message: 'Operation attempted on a disposed container or scope.',
    })
  })
})

describe('ScopedResolutionOutsideScopeError', () => {
  it('carries the offending scoped token', () => {
    expect(new ScopedResolutionOutsideScopeError(createToken('Scoped'))).toMatchObject({
      name: 'ScopedResolutionOutsideScopeError',
      tokenName: 'Scoped',
      message:
        'Scoped token "Scoped" cannot be resolved from the root container. Create a scope first.',
    })
  })
})

describe('InvalidTokenError', () => {
  it('records the offending value', () => {
    expect(new InvalidTokenError({ name: 'fake' })).toMatchObject({
      name: 'InvalidTokenError',
      received: { name: 'fake' },
      message: 'Expected a Token, MultiToken, or class constructor; received object.',
    })
  })
})

describe('CannotOverrideError', () => {
  it('carries the token name and the reason', () => {
    expect(new CannotOverrideError(createToken('Foo'), 'multi')).toMatchObject({
      name: 'CannotOverrideError',
      tokenName: 'Foo',
      reason: 'multi',
      message: 'Token "Foo" is a multi-token; its bindings are additive and cannot be overridden.',
    })
  })
})
