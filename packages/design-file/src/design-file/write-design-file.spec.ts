import { aDesign } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { writeDesignFile } from './write-design-file'

describe('writeDesignFile', () => {
  it('writes a new design as format-version 1, then each section as a node of its fields', () => {
    const design = aDesign()

    expect(writeDesignFile(design)).toBe(
      'format-version 1\nmeta id=corne name=Corne default-part=key {\n\tform type=split board=reversible\n\tgap x="1mm" y="1mm"\n}\nlibrary-versions {\n\tlibrary-version id="lib:blueprint/choc-key" version=1\n}\nparts {\n\tpart type=blueprint id=key blueprint="lib:blueprint/choc-key" {\n\t\tinputs\n\t}\n}\nlayout id=root arrangement=free\n',
    )
  })
})
