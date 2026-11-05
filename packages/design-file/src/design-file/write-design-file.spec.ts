import { designSchema } from '@keeb-cad/schema'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { writeDesignFile } from './write-design-file'

describe('writeDesignFile', () => {
  it('writes a new design as format-version 1, then each section as a node of its fields', () => {
    const design = v.parse(designSchema, {
      meta: { id: 'corne', name: 'Corne', form: { type: 'split', board: 'reversible' } },
      layout: { id: 'root', arrangement: 'free', children: [] },
    })

    expect(writeDesignFile(design)).toBe(
      'format-version 1\nmeta id="corne" name="Corne" {\n    form type="split" board="reversible"\n}\nlayout id="root" arrangement="free"\n',
    )
  })
})
