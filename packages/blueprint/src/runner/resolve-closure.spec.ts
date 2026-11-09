import { aBlueprintDeclaration, aBlueprintId, aVersion } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { aLibraryData } from '../testing/a-library-data'
import { resolveClosure } from './resolve-closure'

const A = aBlueprintId('lib:blueprint/a')
const B = aBlueprintId('lib:blueprint/b')
const C = aBlueprintId('lib:blueprint/c')
const V1 = aVersion(1)
const V2 = aVersion(2)

const uses = (...ids: (typeof A)[]) => ids.map((id) => ({ id, minVersion: V1 }))

const declared = (id: typeof A, used: (typeof A)[], version = V1) =>
  aBlueprintDeclaration({ id, version, uses: uses(...used) })

const library = (...declarations: ReturnType<typeof declared>[]) =>
  aLibraryData(declarations.map((declaration) => ({ declaration }))).declarations

const idsOf = (result: ReturnType<typeof resolveClosure>) =>
  result.match<string[] | string>({
    some: ({ closure }) =>
      closure
        .map(({ id, version }) => `${id}@${String(version)}`)
        .toSorted((a, b) => a.localeCompare(b)),
    none: () => 'none',
  })

describe('resolveClosure', () => {
  it('walks uses transitively, each id at its pinned version', () => {
    const declarations = library(
      declared(A, [B]),
      declared(B, [C]),
      declared(C, [], V1),
      declared(C, [], V2),
    )

    const result = resolveClosure(
      declarations,
      { id: A, version: V1 },
      new Map([
        [B, V1],
        [C, V2],
      ]),
    )

    expect(idsOf(result)).toEqual(['lib:blueprint/b@1', 'lib:blueprint/c@2'])
  })

  it('lists a member reached twice once', () => {
    const declarations = library(declared(A, [B, C]), declared(B, [C]), declared(C, []))

    const result = resolveClosure(
      declarations,
      { id: A, version: V1 },
      new Map([
        [B, V1],
        [C, V1],
      ]),
    )

    expect(idsOf(result)).toEqual(['lib:blueprint/b@1', 'lib:blueprint/c@1'])
  })

  it('is none for a pin the declarations do not hold', () => {
    expect(idsOf(resolveClosure(library(), { id: A, version: V1 }, new Map()))).toBe('none')
  })

  it('is none for a member with no pin', () => {
    const declarations = library(declared(A, [B]), declared(B, []))

    expect(idsOf(resolveClosure(declarations, { id: A, version: V1 }, new Map()))).toBe('none')
  })

  it('is none for a member pinned at a version the declarations do not hold', () => {
    const declarations = library(declared(A, [B]), declared(B, []))

    expect(idsOf(resolveClosure(declarations, { id: A, version: V1 }, new Map([[B, V2]])))).toBe(
      'none',
    )
  })
})
