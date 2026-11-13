import { blueprintWorkerModule } from '@keeb-cad/blueprint/worker'
import { DesignMirror, designWorkerModule } from '@keeb-cad/design/worker'
import { Container } from '@keeb-cad/di'
import { InvariantError } from '@keeb-cad/result'
import type { ToModelWorker } from '@keeb-cad/protocol'
import type { DesignPatch } from '@keeb-cad/schema'
import {
  aDesign,
  aFingerprintsFile,
  aLayoutOutput,
  aMeta,
  aResolvedParts,
  aRevision,
  aRoutingFile,
  aWorkspace,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { pipelineModule } from '../pipeline-module'
import { Pipeline } from './pipeline'

const EPOCH = 1

async function arrange() {
  const container = new Container()
    .addModule(designWorkerModule)
    .addModule(blueprintWorkerModule)
    .addModule(pipelineModule)
  await container.autoLoad()
  const { port1, port2 } = new MessageChannel()
  container.resolve(Pipeline).listen(port1, {
    parts: { value: aResolvedParts() },
    placements: { value: aLayoutOutput() },
    pins: { value: [] },
    violations: { value: [] },
  })
  const posts: unknown[] = []
  port2.addEventListener('message', (event) => posts.push(event.data))
  port2.start()
  return { main: port2, worker: port1, posts, mirror: container.resolve(DesignMirror) }
}

function designMessage(seq: number, name = 'Corne'): ToModelWorker {
  return {
    kind: 'design',
    epoch: EPOCH,
    seq,
    design: aDesign({ meta: aMeta({ name }) }),
    ...derivedFiles(),
    revision: aRevision(`r${seq}`),
  }
}

function derivedFiles() {
  return {
    routing: aRoutingFile({ revision: aRevision('r0') }),
    fingerprints: aFingerprintsFile({ revision: aRevision('r0') }),
  }
}

function patchesMessage(
  seq: number,
  patches: DesignPatch[] = [{ op: 'replace', path: ['meta', 'name'], value: 'Corne v2' }],
): ToModelWorker {
  return { kind: 'patches', epoch: EPOCH, seq, patches, revision: aRevision(`r${seq}`) }
}

function expectedPostsAt(seq: number): unknown[] {
  return [
    { kind: 'stage-started', epoch: EPOCH, seq, stage: 'parts' },
    { kind: 'stage-started', epoch: EPOCH, seq, stage: 'layout' },
    expect.objectContaining({ kind: 'layout-set', epoch: EPOCH, seq }),
    { kind: 'issues', epoch: EPOCH, seq, violations: [] },
    {
      kind: 'derived-files',
      epoch: EPOCH,
      seq,
      ...derivedFiles(),
      revision: `r${seq}`,
    },
  ]
}

const POSTS_PER_SEQ = expectedPostsAt(0).length

// The order within one seq is pipeline-stages.spec.ts's.
function postsAt(seq: number) {
  return expect.arrayContaining(expectedPostsAt(seq)) as unknown
}

describe('Pipeline', () => {
  it('applies patches to the whole design it was sent, deeply frozen', async () => {
    const { main, posts, mirror } = await arrange()

    main.postMessage(designMessage(1))
    main.postMessage(patchesMessage(2))
    await expect.poll(() => posts).toHaveLength(2 * POSTS_PER_SEQ)

    expect(mirror.value).toEqual(aDesign({ meta: aMeta({ name: 'Corne v2' }) }))
    expect(() => Object.assign(mirror.value.meta, { name: 'stray' })).toThrow(TypeError)
    expect(() => Object.assign(mirror.value.layout, { id: 'stray' })).toThrow(TypeError)
  })

  it('posts empty issues and the derived files at each design seq, echoing its revision', async () => {
    const { main, posts } = await arrange()

    main.postMessage(designMessage(1))
    main.postMessage(patchesMessage(2))
    await expect.poll(() => posts).toHaveLength(2 * POSTS_PER_SEQ)

    expect([posts.slice(0, POSTS_PER_SEQ), posts.slice(POSTS_PER_SEQ)]).toEqual([
      postsAt(1),
      postsAt(2),
    ])
  })

  it('replaces the mirror with a later whole design', async () => {
    const { main, posts, mirror } = await arrange()

    main.postMessage(designMessage(1))
    main.postMessage(designMessage(3, 'Other'))
    await expect.poll(() => posts).toHaveLength(2 * POSTS_PER_SEQ)

    expect(mirror.value).toEqual(aDesign({ meta: aMeta({ name: 'Other' }) }))
    expect(posts.slice(POSTS_PER_SEQ)).toEqual(postsAt(3))
  })

  it('neither applies nor answers what its gate drops', async () => {
    const { main, posts, mirror } = await arrange()
    const dropped: DesignPatch[] = [
      { op: 'replace', path: ['meta', 'form', 'board'], value: 'mirrored' },
    ]

    main.postMessage(designMessage(1))
    main.postMessage(patchesMessage(1, dropped))
    main.postMessage(patchesMessage(2))
    await expect.poll(() => posts).toHaveLength(2 * POSTS_PER_SEQ)

    expect(mirror.value).toEqual(aDesign({ meta: aMeta({ name: 'Corne v2' }) }))
    expect([posts.slice(0, POSTS_PER_SEQ), posts.slice(POSTS_PER_SEQ)]).toEqual([
      postsAt(1),
      postsAt(2),
    ])
  })

  it('neither applies nor answers patches before the first whole design', async () => {
    const { main, worker, posts, mirror } = await arrange()
    // Added after Pipeline's own listener, so it fires once Pipeline has handled the message.
    const delivered = new Promise((resolve) => {
      worker.addEventListener('message', resolve, { once: true })
    })

    main.postMessage(patchesMessage(2))
    await delivered

    expect(posts).toEqual([])
    expect(() => mirror.value).toThrow(InvariantError)
    main.postMessage(designMessage(3))
    await expect.poll(() => posts).toEqual(postsAt(3))
    expect(posts).toHaveLength(POSTS_PER_SEQ)
  })

  it('posts nothing for focus', async () => {
    const { main, posts } = await arrange()

    main.postMessage(designMessage(1))
    main.postMessage({ kind: 'focus', epoch: EPOCH, seq: 1, workspace: aWorkspace() })
    main.postMessage(patchesMessage(2))
    await expect.poll(() => posts).toHaveLength(2 * POSTS_PER_SEQ)

    expect([posts.slice(0, POSTS_PER_SEQ), posts.slice(POSTS_PER_SEQ)]).toEqual([
      postsAt(1),
      postsAt(2),
    ])
  })
})
