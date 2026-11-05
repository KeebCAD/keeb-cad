import { expectOk } from '@keeb-cad/result/testing'
import { describe, expect, it } from 'vitest'

import { readBundle } from './read-bundle'

const designText =
  'format-version 1\nmeta id="corne" name="Corne" {\n    form type="split" board="reversible"\n}\nlayout id="root" arrangement="free"\n'

const design = {
  meta: { id: 'corne', name: 'Corne', form: { type: 'split', board: 'reversible' } },
  layout: { id: 'root', arrangement: 'free', children: [] },
}

describe('readBundle', () => {
  it('reads each text as its own file of the bundle', () => {
    const result = readBundle({
      design: designText,
      routing: 'revision "r1"\n',
      fingerprints: 'revision "r2"\nfingerprints\n',
    })

    expectOk(result)
    expect(result.value).toEqual({
      design,
      routing: { revision: 'r1' },
      fingerprints: { revision: 'r2', fingerprints: [] },
      unreadable: [],
    })
  })

  it('reads a design text alone as a bundle with no derived files', () => {
    const result = readBundle({ design: designText })

    expectOk(result)
    expect(result.value).toEqual({ design, unreadable: [] })
  })
})
