import { Container } from '@keeb-cad/di'
import { AsyncResult, Result } from '@keeb-cad/result'
import type { BlueprintDeclaration, LibraryData } from '@keeb-cad/schema'
import { aBlueprintDeclaration, aBlueprintId, aVersion } from '@keeb-cad/schema/testing'
import { describe, expect, it, vi } from 'vitest'

import type { LaneFailure, LaneOutput } from '../lane/types'
import { blueprintWorkerModule } from '../pool/blueprint-worker-module'
import { VmPool } from '../pool/vm-pool'
import { aLibraryData } from '../testing/a-library-data'
import { noArgs, noCalls } from '../testing/a-pinned-blueprint'
import { errOf, outcomeOf } from '../testing/outcome'
import { LaneRunner } from './lane-runner'

class AnsweringPool extends VmPool {
  answer: Result<LaneOutput, LaneFailure> = Result.err({ kind: 'unavailable' })
  runs = 0

  override pause(): AsyncResult<void, never> {
    return AsyncResult.ok()
  }

  override runLane(): Result<LaneOutput, LaneFailure> {
    this.runs += 1
    return this.answer
  }
}

const inputs = { canonical: { width: '19mm' }, laneArgs: noArgs }
const declaration = aBlueprintDeclaration()
const pin = { id: declaration.id, version: declaration.version }
const lane = { id: declaration.id, version: declaration.version, stage: 'parts', stageVersion: 1 }

async function arrange(
  blueprints: readonly BlueprintDeclaration[] = [declaration],
): Promise<{ runner: LaneRunner; pool: AnsweringPool; library: LibraryData }> {
  const container = new Container().addModule(blueprintWorkerModule)
  container.override(VmPool).useClass(AnsweringPool)
  await container.autoLoad()
  const pool = container.resolve(VmPool) as AnsweringPool
  const library = aLibraryData(blueprints.map((entry) => ({ declaration: entry, script: '({})' })))
  const runner = container.resolve(LaneRunner)
  runner.useLibrary(library)
  return { runner, pool, library }
}

describe('LaneRunner', () => {
  it('asks the pool again for a lane that was unavailable', async () => {
    const { runner, pool } = await arrange()
    await runner.pause([pin])

    runner.runLane(lane, noCalls, inputs)
    runner.runLane(lane, noCalls, inputs)

    expect(pool.runs).toBe(2)
    expect(runner.hasUnavailable).toBe(true)
  })

  it('lets the pool answer blueprint-api-too-new each time', async () => {
    const { runner, pool } = await arrange()
    await runner.pause([pin])
    pool.answer = Result.err({ kind: 'blueprint-api-too-new', blueprint: declaration.id })

    runner.runLane(lane, noCalls, inputs)
    runner.runLane(lane, noCalls, inputs)

    expect(pool.runs).toBe(2)
  })

  it('never loads a pin the declarations do not hold, answers unavailable and asks for no retry', async () => {
    const { runner, library } = await arrange([])
    const loadScript = vi.spyOn(library, 'loadScript')

    await runner.pause([pin])

    expect(loadScript).not.toHaveBeenCalled()
    expect(outcomeOf(runner.runLane(lane, noCalls, inputs))).toEqual(errOf({ kind: 'unavailable' }))
    expect(runner.hasUnavailable).toBe(false)
  })

  it('never loads a pin whose closure member the declarations do not hold, answers unavailable and asks for no retry', async () => {
    const used = aBlueprintId('lib:blueprint/absent')
    const caller = aBlueprintDeclaration({ uses: [{ id: used, minVersion: aVersion() }] })
    const { runner, library } = await arrange([caller])
    const loadScript = vi.spyOn(library, 'loadScript')

    await runner.pause([{ id: caller.id, version: caller.version }])

    expect(loadScript).not.toHaveBeenCalled()
    expect(outcomeOf(runner.runLane(lane, noCalls, inputs))).toEqual(errOf({ kind: 'unavailable' }))
    expect(runner.hasUnavailable).toBe(false)
  })

  it('needs no library for a pause with no pins', async () => {
    const container = new Container().addModule(blueprintWorkerModule)
    await container.autoLoad()

    const paused = await container.resolve(LaneRunner).pause([])

    expect(paused.isOk()).toBe(true)
  })
})
