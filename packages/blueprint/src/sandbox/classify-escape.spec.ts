import { describe, expect, it } from 'vitest'

import { classifyEscape } from './classify-escape'

describe('classifyEscape', () => {
  it('reports an engine trap with a fixed message and a dead VM', () => {
    expect(
      classifyEscape(
        { kind: 'thrown', error: new WebAssembly.RuntimeError('unreachable at 0x1234') },
        { exhausted: false },
      ),
    ).toEqual({
      failure: { kind: 'lane-failed', cause: 'boundary', message: 'the engine trapped' },
      vmDead: true,
    })
  })

  it.each([
    ['spent', true, 'step-budget'],
    ['unspent', false, 'out-of-memory'],
  ])('types a raw exception with the budget %s', (_role, exhausted, expectedCause) => {
    expect(classifyEscape({ kind: 'raw-exception' }, { exhausted })).toEqual({
      failure: { kind: 'lane-failed', cause: expectedCause },
      vmDead: false,
    })
  })
})
