import { Container } from '@keeb-cad/di'
import { InvariantError } from '@keeb-cad/result'
import { aDesign, aMeta, aRevision } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { expectDeeplyFrozen } from '../testing'
import { designWorkerModule } from '../worker-module'
import { DesignMirror } from './design-mirror'
import { DesignMirrorWriter } from './design-mirror-writer'

async function arrange() {
  const container = new Container().addModule(designWorkerModule)
  await container.autoLoad()
  return {
    mirror: container.resolve(DesignMirror),
    writer: container.resolve(DesignMirrorWriter),
  }
}

describe('DesignMirror', () => {
  it.each([
    ['its design', (mirror: DesignMirror) => mirror.value],
    ['its revision', (mirror: DesignMirror) => mirror.revision],
  ])('throws when %s is read before the first whole design', async (_what, read) => {
    const { mirror } = await arrange()

    expect(() => read(mirror)).toThrow(InvariantError)
  })

  it('holds a whole design deeply frozen, with the revision it came with', async () => {
    const { mirror, writer } = await arrange()
    const revision = aRevision('r7')

    writer.replace(aDesign(), revision)

    expect(mirror.value).toEqual(aDesign())
    expectDeeplyFrozen(mirror.value)
    expect(mirror.revision).toBe(revision)
  })

  it('replaces the whole design when another arrives', async () => {
    const { mirror, writer } = await arrange()
    writer.replace(aDesign(), aRevision('r1'))
    const next = aDesign({ meta: aMeta({ name: 'Other' }) })

    writer.replace(next, aRevision('r2'))

    expect({ design: mirror.value, revision: mirror.revision }).toEqual({
      design: aDesign({ meta: aMeta({ name: 'Other' }) }),
      revision: aRevision('r2'),
    })
  })

  it('applies patches, deeply frozen, with their revision', async () => {
    const { mirror, writer } = await arrange()
    writer.replace(aDesign(), aRevision('r1'))

    writer.apply([{ op: 'replace', path: ['meta', 'name'], value: 'B' }], aRevision('r2'))

    expect(mirror.value).toEqual(aDesign({ meta: aMeta({ name: 'B' }) }))
    expectDeeplyFrozen(mirror.value)
    expect(mirror.revision).toBe(aRevision('r2'))
  })

  it('throws when patches arrive before the first whole design', async () => {
    const { writer } = await arrange()

    expect(() =>
      writer.apply([{ op: 'replace', path: ['meta', 'name'], value: 'B' }], aRevision('r2')),
    ).toThrow(InvariantError)
  })
})
