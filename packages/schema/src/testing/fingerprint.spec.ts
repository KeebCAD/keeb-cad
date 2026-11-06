import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { fingerprintSchema } from '../fingerprint'
import { aFingerprint } from './fingerprint'
import { aHash } from './hash'
import { anId } from './id'

describe('aFingerprint', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(fingerprintSchema, aFingerprint()).issues).toBeUndefined()
  })

  it.each([
    ['id', () => ({ id: anId('other') })],
    ['slice', () => ({ slice: aHash('h2') })],
    ['outputs', () => ({ outputs: aHash('h3') })],
  ])('keeps the %s it is given', (_field, makeFields) => {
    const fields = makeFields()

    expect(aFingerprint(fields)).toMatchObject(fields)
  })
})
