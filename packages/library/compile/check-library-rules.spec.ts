import type { BlueprintDeclaration } from '@keeb-cad/schema'
import {
  aBlueprintDeclaration,
  aBlueprintId,
  aLaneDeclaration,
  aVersion,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { checkLibraryRules } from './check-library-rules'

const A = aBlueprintId('lib:blueprint/a')
const B = aBlueprintId('lib:blueprint/b')
const C = aBlueprintId('lib:blueprint/c')
const min = aVersion()

const noLanes = (id: typeof A, used: (typeof A)[] = []) =>
  aBlueprintDeclaration({
    id,
    lanes: {},
    uses: used.map((target) => ({ id: target, minVersion: min })),
  })

const MIN_VERSION = 2

const callerOfB = aBlueprintDeclaration({
  id: A,
  lanes: {},
  uses: [{ id: B, minVersion: aVersion(MIN_VERSION) }],
})

const pulling = { shapes: aLaneDeclaration({ pulls: [{ role: 'x', count: 'any' }], outputs: [] }) }

const bAt = (version: number, overrides: Partial<BlueprintDeclaration> = {}) =>
  aBlueprintDeclaration({ id: B, version: aVersion(version), lanes: {}, ...overrides })

const usingA = { uses: [{ id: A, minVersion: min }] }

const rules = (...declarations: BlueprintDeclaration[]) =>
  checkLibraryRules(declarations.map((declaration) => ({ declaration, visibleUses: [] })))

const rectangle = { name: 'r', role: 'rectangle', kind: 'shape', count: 'one' } as const

const partsWith = (...counts: ('one' | 'any')[]) =>
  aBlueprintDeclaration({
    id: A,
    lanes: {
      parts: aLaneDeclaration({
        outputs: counts.map((count, index) => ({
          ...rectangle,
          count,
          name: `r${String(index)}`,
        })),
      }),
    },
  })

const rectangleProblem = (found: string) =>
  `lib:blueprint/a: a part blueprint declares exactly one rectangle of count one, found: ${found}`

describe('checkLibraryRules', () => {
  it.each<[string, ('one' | 'any')[], string[]]>([
    ['no rectangle', [], [rectangleProblem('')]],
    ['one rectangle', ['one'], []],
    ['two rectangles', ['one', 'one'], [rectangleProblem('one, one')]],
    ['one rectangle of count any', ['any'], [rectangleProblem('any')]],
  ])('on a part blueprint with %s', (_role, counts, expected) => {
    expect(rules(partsWith(...counts))).toEqual(expected)
  })

  it('passes a blueprint with no parts lane and no rectangle', () => {
    expect(rules(noLanes(A))).toEqual([])
  })

  it('fails a cycle of two, naming the ids', () => {
    expect(rules(noLanes(A, [B]), noLanes(B, [A]))).toEqual([`a uses cycle: ${A} -> ${B} -> ${A}`])
  })

  it('fails a self-use', () => {
    expect(rules(noLanes(A, [A]))).toEqual([`a uses cycle: ${A} -> ${A}`])
  })

  it('passes a chain with no cycle', () => {
    expect(rules(noLanes(A, [B]), noLanes(B, [C]), noLanes(C))).toEqual([])
  })

  it('fails a uses target the library lacks, naming it', () => {
    expect(rules(noLanes(A, [B]))).toEqual([`${A}: uses ${B}, which the library lacks`])
  })

  const targetProblem = `${A}: uses ${B}@${String(aVersion())}, which has pulls or queries`

  it.each([
    [
      'a pull',
      aLaneDeclaration({ pulls: [{ role: 'x', count: 'any' }], outputs: [] }),
      [targetProblem],
    ],
    ['a query', aLaneDeclaration({ queries: ['q'], outputs: [] }), [targetProblem]],
    ['neither', aLaneDeclaration({ outputs: [] }), []],
  ])('on a uses target with %s', (_role, lane, expected) => {
    const target = aBlueprintDeclaration({ id: B, version: aVersion(), lanes: { shapes: lane } })

    expect(rules(noLanes(A, [B]), target)).toEqual(expected)
  })

  it.each([
    [
      'just below minVersion, alone',
      [bAt(MIN_VERSION - 1)],
      [`${A}: uses ${B}, which the library lacks`],
    ],
    [
      'just below minVersion, beside a clean version on it',
      [bAt(MIN_VERSION - 1, { lanes: pulling }), bAt(MIN_VERSION)],
      [],
    ],
    [
      'on minVersion',
      [bAt(MIN_VERSION, { lanes: pulling })],
      [`${A}: uses ${B}@${String(MIN_VERSION)}, which has pulls or queries`],
    ],
    [
      'just above minVersion',
      [bAt(MIN_VERSION + 1, { lanes: pulling })],
      [`${A}: uses ${B}@${String(MIN_VERSION + 1)}, which has pulls or queries`],
    ],
  ])('on a uses target %s', (_role, targets, expected) => {
    expect(rules(callerOfB, ...targets)).toEqual(expected)
  })

  it.each([
    ['just below minVersion', [bAt(MIN_VERSION - 1, usingA), bAt(MIN_VERSION)], []],
    ['on minVersion', [bAt(MIN_VERSION, usingA)], [`a uses cycle: ${A} -> ${B} -> ${A}`]],
    [
      'just above minVersion',
      [bAt(MIN_VERSION + 1, usingA)],
      [`a uses cycle: ${A} -> ${B} -> ${A}`],
    ],
  ])('on a cycle through a target %s', (_role, targets, expected) => {
    expect(rules(callerOfB, ...targets)).toEqual(expected)
  })

  it('passes a visible use() of an id in uses', () => {
    const declaration = noLanes(A, [B])

    expect(
      checkLibraryRules([
        { declaration, visibleUses: [B] },
        { declaration: noLanes(B), visibleUses: [] },
      ]),
    ).toEqual([])
  })

  it('fails a visible use() of an id not in uses, naming it', () => {
    expect(checkLibraryRules([{ declaration: noLanes(A), visibleUses: [B] }])).toEqual([
      `${A}: use() of ${B}, which is not in uses`,
    ])
  })

  it('fails two sources declaring one version', () => {
    expect(rules(noLanes(A), noLanes(A))).toEqual([`${A}@1: declared by two sources`])
  })
})
