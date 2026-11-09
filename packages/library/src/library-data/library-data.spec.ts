import { aBlueprintId, aVersion } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { declarations as mainDeclarations } from '../index'
import { libraryData } from './library-data'

describe('libraryData', () => {
  it('holds the same declarations as the main subpath', () => {
    expect(libraryData.declarations).toBe(mainDeclarations)
  })

  it('answers script-load-failed for a script the build did not emit', async () => {
    const result = await libraryData.loadScript(aBlueprintId('lib:blueprint/absent'), aVersion())

    expect(result.match<unknown>({ ok: (ok) => ({ ok }), err: (err) => ({ err }) })).toEqual({
      err: { kind: 'script-load-failed', message: 'no script for lib:blueprint/absent@1' },
    })
  })
})
