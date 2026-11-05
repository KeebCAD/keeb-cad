import { describe, expect, it } from 'vitest'

import { SHARED_SPEC_STATE } from '../../eslint.config'
import { restrictedSyntax } from './restricted-syntax'
import { COLD_CONFIG_TIMEOUT } from './cold-config-timeout'

const [LET, SPY, EMPTY] = SHARED_SPEC_STATE.map((entry) => entry.message)
const SPEC = 'packages/x/src/foo.spec.ts'

describe('no shared state in a spec', { timeout: COLD_CONFIG_TIMEOUT }, () => {
  it.each([
    ['a module-level let', 'let calls = 0', LET],
    ['a module-level var', 'var calls = 0', LET],
    ['a let in a describe callback', "describe('x', () => {\n  let n = 0\n})", LET],
    [
      'a let in a describe.each callback',
      "describe.each([1])('x %s', () => {\n  let n = 0\n})",
      LET,
    ],
    ['an exported let', 'export let calls = 0', LET],
    ['a module-level spy', "const log = vi.spyOn(console, 'log')", SPY],
    [
      'a bare module-level spy statement',
      "vi.spyOn(console, 'warn').mockImplementation(() => {})",
      SPY,
    ],
    [
      'a bare spy statement in a describe callback',
      "describe('x', () => {\n  vi.spyOn(console, 'warn')\n})",
      SPY,
    ],
    ['an exported spy', 'export const spy = vi.fn()', SPY],
    ['an exported empty array', 'export const calls: string[] = []', EMPTY],
    ['a spy in a describe callback', "describe('x', () => {\n  const spy = vi.fn()\n})", SPY],
    [
      'a spy in an object at describe level',
      "describe('x', () => {\n  const r = { resolve: vi.fn().mockReturnValue(1) }\n})",
      SPY,
    ],
    ['a module-level empty array', 'const calls: string[] = []', EMPTY],
    ['a module-level empty array cast', 'const calls = [] as string[]', EMPTY],
    ['a module-level empty object', 'const seen = {}', EMPTY],
    ['a module-level Map', 'const seen = new Map()', EMPTY],
    ['a module-level Set', 'const seen = new Set<string>()', EMPTY],
    ['a module-level WeakMap', 'const seen = new WeakMap()', EMPTY],
    ['a module-level WeakSet', 'const seen = new WeakSet()', EMPTY],
    ['a module-level Array', 'const seen = new Array()', EMPTY],
    [
      'an empty array in a describe callback',
      "describe('x', () => {\n  const calls = []\n})",
      EMPTY,
    ],
  ])('rejects %s', async (_, code, message) => {
    expect(await restrictedSyntax(code, SPEC)).toEqual([message])
  })

  it.each([
    [
      'a recording inside a test',
      "it('records', () => {\n  const calls: string[] = []\n  let n = 0\n  const spy = vi.fn()\n})",
    ],
    [
      'a recording inside a test in a describe',
      "describe('x', () => {\n  it('records', () => {\n    const calls: string[] = []\n  })\n})",
    ],
    ['a frozen fixture', 'const CASES = [{ a: 1 }] as const'],
    ['a non-empty table', "const ROWS = ['a', 'b']"],
    ['a helper that creates a spy per call', 'const fake = () => ({ resolve: vi.fn() })'],
    ['a function that creates a spy per call', 'function fake() {\n  return vi.fn()\n}'],
    [
      'a describe-level helper that creates a spy per call',
      "describe('x', () => {\n  const fake = () => vi.fn()\n})",
    ],
  ])('allows %s', async (_, code) => {
    expect(await restrictedSyntax(code, SPEC)).toEqual([])
  })

  it('applies to specs outside packages', async () => {
    expect(await restrictedSyntax('let calls = 0', 'tooling/foo.spec.ts')).toEqual([LET])
  })
})
