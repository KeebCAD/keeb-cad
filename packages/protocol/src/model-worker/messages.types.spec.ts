import type { DesignPatch, StageId, Workspace } from '@keeb-cad/schema'
import { describe, expectTypeOf, it } from 'vitest'

import type { PackedLayoutOutput } from '../layout-output/types'
import type { PackedPartsOutput } from '../parts-output/types'
import type { FromModelWorker, ModelWorkerMessage } from './types'

type Of<K extends ModelWorkerMessage['kind']> = Extract<ModelWorkerMessage, { kind: K }>

describe('ModelWorkerMessage', () => {
  it("takes its payloads' kinds from schema", () => {
    expectTypeOf<Of<'patches'>['patches']>().toEqualTypeOf<readonly DesignPatch[]>()
    expectTypeOf<Of<'focus'>['workspace']>().toEqualTypeOf<Workspace>()
    expectTypeOf<Of<'stage-started'>['stage']>().toEqualTypeOf<StageId>()
  })

  it('carries the layout set packed, from the model worker', () => {
    expectTypeOf<Of<'layout-set'>['parts']>().toEqualTypeOf<PackedPartsOutput>()
    expectTypeOf<Of<'layout-set'>['layout']>().toEqualTypeOf<PackedLayoutOutput>()
    expectTypeOf<Of<'layout-set'>>().toExtend<FromModelWorker>()
  })

  it('refuses a layout-set without its parts', () => {
    expectTypeOf<Omit<Of<'layout-set'>, 'parts'>>().not.toExtend<ModelWorkerMessage>()
  })

  it('accepts issues with no violations', () => {
    expectTypeOf({
      kind: 'issues' as const,
      epoch: 1,
      seq: 1,
      violations: [],
    }).toExtend<ModelWorkerMessage>()
  })

  it('refuses issues with a violation while no violation kind exists', () => {
    expectTypeOf({
      kind: 'issues' as const,
      epoch: 1,
      seq: 1,
      violations: [
        {
          kind: 'overlap' as const,
          severity: 'error' as const,
          ids: [],
          message: 'Keys overlap.',
          fixes: [],
        },
      ],
    }).not.toExtend<ModelWorkerMessage>()
  })

  it('refuses a stage-started for a stage outside StageId', () => {
    expectTypeOf({
      kind: 'stage-started' as const,
      epoch: 1,
      seq: 1,
      stage: 'routing' as const,
    }).not.toExtend<ModelWorkerMessage>()
  })
})
