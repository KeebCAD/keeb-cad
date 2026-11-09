import { anId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { partViolationMessage } from './part-violation-message'
import type { PartViolationDetail } from './types'

const ids = [anId('key')]

describe('partViolationMessage', () => {
  it.each<[string, PartViolationDetail, string]>([
    [
      'an unresolvable reference',
      { kind: 'unresolvable-reference' },
      'The slot "key" names a part that doesn\'t resolve.',
    ],
    [
      'a blueprint too new',
      { kind: 'blueprint-api-too-new', blueprint: 'lib:blueprint/x' },
      'The part "key" needs a newer app: lib:blueprint/x.',
    ],
    [
      'a throw',
      { kind: 'lane-failed', cause: 'threw', message: 'boom' },
      'The part "key" failed: boom.',
    ],
    [
      'the step budget',
      { kind: 'lane-failed', cause: 'step-budget' },
      'The part "key" failed: it ran past its step budget.',
    ],
    [
      'out of memory',
      { kind: 'lane-failed', cause: 'out-of-memory' },
      'The part "key" failed: it ran out of memory.',
    ],
    [
      'a value JSON cannot carry',
      { kind: 'lane-failed', cause: 'not-json-exact', path: 'outputs.w' },
      'The part "key" failed: not a JSON-exact value at outputs.w.',
    ],
    [
      'a pending job',
      { kind: 'lane-failed', cause: 'pending-job' },
      'The part "key" failed: it left a pending job.',
    ],
    [
      'a bad role',
      { kind: 'lane-failed', cause: 'role', output: 'rectangle' },
      'The part "key" failed: the output "rectangle" is not what it declares.',
    ],
    [
      'a nested input',
      { kind: 'lane-failed', cause: 'nested-input', blueprint: 'lib:blueprint/y', input: 'size' },
      'The part "key" failed: the nested input "size" of lib:blueprint/y.',
    ],
    [
      'a boundary failure',
      { kind: 'lane-failed', cause: 'boundary', message: 'trap' },
      'The part "key" failed: trap.',
    ],
  ])('words %s', (_role, detail, expected) => {
    expect(partViolationMessage(detail, ids)).toBe(expected)
  })
})
