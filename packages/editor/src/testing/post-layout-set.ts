import { packLayoutOutput, packPartsOutput } from '@keeb-cad/protocol'
import type { FakeWorker } from '@keeb-cad/workers/testing'

import type { LayoutSetPost } from './types'

// Posts as the worker's first epoch does, the only one a test's single spawn reaches.
export function postLayoutSet(
  worker: FakeWorker,
  { seq, layout, parts, epoch = 1 }: LayoutSetPost,
): void {
  worker.post({
    kind: 'layout-set',
    epoch,
    seq,
    layout: packLayoutOutput(layout),
    parts: packPartsOutput(parts),
  })
}
