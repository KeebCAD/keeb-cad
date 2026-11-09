import { describe, expect, it } from 'vitest'

import { decodeLaneResult } from './decode-lane-result'
import { errOf, okOf, outcomeOf } from '../testing/outcome'

describe('decodeLaneResult', () => {
  it.each([
    ['an empty string', ''],
    ['unparsable text', '{nope'],
    ['an unknown tag', '{"later":1}'],
    ['a tag with a wrong value', '{"failed":1}'],
  ])('fails %s as a boundary cause', (_role, text) => {
    expect(outcomeOf(decodeLaneResult(text))).toEqual(
      errOf({
        kind: 'lane-failed',
        cause: 'boundary',
        message: 'the boundary returned an unreadable result',
      }),
    )
  })

  it.each([
    ['ok', '{"ok":{"a":1}}', okOf({ a: 1 })],
    [
      'a throw',
      '{"failed":"boom"}',
      errOf({ kind: 'lane-failed', cause: 'threw', message: 'boom' }),
    ],
    [
      'a value JSON cannot carry',
      '{"notJsonExact":{"path":"$.a","reason":"NaN"}}',
      errOf({ kind: 'lane-failed', cause: 'not-json-exact', path: '$.a' }),
    ],
    [
      'out of memory',
      '{"outOfMemory":true}',
      errOf({ kind: 'lane-failed', cause: 'out-of-memory' }),
    ],
  ])('reads %s', (_role, text, expected) => {
    expect(outcomeOf(decodeLaneResult(text))).toEqual(expected)
  })
})
