import { aParameterName, anId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { dependencyCycleMessage } from './dependency-cycle-message'
import { divisionByZeroMessage } from './division-by-zero-message'
import { expressionViolations } from './expression-violations'
import { unitMismatchMessage } from './unit-mismatch-message'
import { unresolvableReferenceMessage } from './unresolvable-reference-message'

describe('expressionViolations', () => {
  it('reports two failing fields of one kind on one item once', () => {
    const k = anId('k')

    expect(
      expressionViolations({
        cycles: [],
        fieldViolations: [
          { kind: 'unit-mismatch', item: k, path: ['offset', 'position', 'x'] },
          { kind: 'unit-mismatch', item: k, path: ['offset', 'position', 'y'] },
        ],
      }),
    ).toEqual([
      {
        kind: 'unit-mismatch',
        severity: 'error',
        ids: [k],
        message: unitMismatchMessage([k]),
        fixes: [],
      },
    ])
  })

  it('reports each missing name once, naming its users in design order, after the loops', () => {
    const [a, b] = [anId('a'), anId('b')]
    const loop = [aParameterName('p'), aParameterName('q')]
    const users = [a, b]

    expect(
      expressionViolations({
        cycles: [loop],
        fieldViolations: [
          { kind: 'unresolvable-reference', name: 'nope', item: a, path: ['offset', 'rotation'] },
          { kind: 'unresolvable-reference', name: 'gone', item: a, path: ['offset', 'pivot', 'x'] },
          { kind: 'unresolvable-reference', name: 'nope', item: b, path: ['offset', 'rotation'] },
        ],
      }),
    ).toEqual([
      {
        kind: 'dependency-cycle',
        severity: 'error',
        ids: loop,
        message: dependencyCycleMessage(loop, 'parameters'),
        fixes: [],
      },
      {
        kind: 'unresolvable-reference',
        severity: 'error',
        ids: users,
        message: unresolvableReferenceMessage({ parameter: 'nope' }, users),
        fixes: [],
      },
      {
        kind: 'unresolvable-reference',
        severity: 'error',
        ids: [a],
        message: unresolvableReferenceMessage({ parameter: 'gone' }, [a]),
        fixes: [],
      },
    ])
  })

  it('reports a parameter and a node that share the id wall apart', () => {
    const [parameter, node] = [aParameterName('wall'), anId('wall')]
    const ids = [parameter]

    expect(
      expressionViolations({
        cycles: [],
        fieldViolations: [
          { kind: 'division-by-zero', item: parameter, path: ['value'] },
          { kind: 'division-by-zero', item: node, path: ['offset', 'position', 'x'] },
        ],
      }),
    ).toEqual([
      {
        kind: 'division-by-zero',
        severity: 'error',
        ids,
        message: divisionByZeroMessage(ids),
        fixes: [],
      },
      {
        kind: 'division-by-zero',
        severity: 'error',
        ids: [node],
        message: divisionByZeroMessage([node]),
        fixes: [],
      },
    ])
  })
})
