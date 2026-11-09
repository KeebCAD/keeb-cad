import { Container } from '@keeb-cad/di'
import type { BlueprintDeclaration } from '@keeb-cad/schema'
import {
  aBlueprintDeclaration,
  aBlueprintId,
  aLaneDeclaration,
  aVersion,
} from '@keeb-cad/schema/testing'
import { describe, expect, it, vi } from 'vitest'

import { blueprintWorkerModule } from '../pool/blueprint-worker-module'
import { aLibraryData } from '../testing/a-library-data'
import {
  laneFailed,
  laneScript,
  noArgs,
  noCalls,
  okValue,
  returning,
} from '../testing/a-pinned-blueprint'
import { errOf, outcomeOf } from '../testing/outcome'
import { LaneCache } from './lane-cache'
import { LaneRunner } from './lane-runner'
import type { LibraryBlueprint } from '../testing/types'

const valueLane = aLaneDeclaration({
  outputs: [{ name: 'value', role: 'value', kind: 'config', count: 'one' }],
})

const aValueDeclaration = (overrides: Partial<BlueprintDeclaration> = {}) =>
  aBlueprintDeclaration({ lanes: { parts: valueLane }, ...overrides })

const inputs = { canonical: {}, laneArgs: noArgs }

const pinOf = ({ id, version }: BlueprintDeclaration) => ({ id, version })
const laneOf = ({ id, version }: BlueprintDeclaration) => ({
  id,
  version,
  stage: 'parts',
  stageVersion: 1,
})

async function arrange(blueprints: readonly LibraryBlueprint[]) {
  const container = new Container().addModule(blueprintWorkerModule)
  await container.autoLoad()
  const runner = container.resolve(LaneRunner)
  runner.useLibrary(aLibraryData(blueprints))
  return { runner, cache: container.resolve(LaneCache) }
}

const countingCalls = () => {
  const tick = vi.fn(() => 1)
  return { tick, calls: { ...noCalls, operations: { tick } } }
}

describe('LaneRunner on the real engine', () => {
  it('runs identical lanes once and holds one entry', async () => {
    const declaration = aValueDeclaration()
    const script = laneScript(`op.tick(); ${returning('1')}`)
    const { runner, cache } = await arrange([{ declaration, script }])
    await runner.pause([pinOf(declaration)])
    const { tick, calls } = countingCalls()

    runner.runLane(laneOf(declaration), calls, inputs)
    const second = runner.runLane(laneOf(declaration), calls, inputs)

    expect(outcomeOf(second)).toEqual(okValue(1))
    expect(tick).toHaveBeenCalledOnce()
    expect(cache.size).toBe(1)
  })

  it('runs a deterministic failure once and answers it both times', async () => {
    const declaration = aValueDeclaration()
    const script = laneScript(`op.tick(); throw new Error('nope')`)
    const { runner } = await arrange([{ declaration, script }])
    await runner.pause([pinOf(declaration)])
    const { tick, calls } = countingCalls()
    const failure = laneFailed({ cause: 'threw', message: 'Error: nope' })

    const first = runner.runLane(laneOf(declaration), calls, inputs)
    const second = runner.runLane(laneOf(declaration), calls, inputs)

    expect([outcomeOf(first), outcomeOf(second)]).toEqual([failure, failure])
    expect(tick).toHaveBeenCalledOnce()
  })

  it('caches the run that killed its VM and not the next lane on the dead VM', async () => {
    const declaration = aValueDeclaration()
    const script = laneScript(`Promise.resolve().then(() => 1); ${returning('args.inputs.n')}`)
    const { runner, cache } = await arrange([{ declaration, script }])
    await runner.pause([pinOf(declaration)])
    const lane = laneOf(declaration)

    const killed = runner.runLane(lane, noCalls, { canonical: { n: 1 }, laneArgs: noArgs })
    const entries = cache.size
    const next = runner.runLane(lane, noCalls, { canonical: { n: 2 }, laneArgs: noArgs })

    expect(outcomeOf(killed)).toEqual(laneFailed({ cause: 'pending-job' }))
    expect(entries).toBe(1)
    expect(outcomeOf(next)).toEqual(errOf({ kind: 'unavailable' }))
    expect(cache.size).toBe(1)
    expect(runner.hasUnavailable).toBe(true)
  })

  it('answers unavailable, uncached, when a pin fails to load', async () => {
    const declaration = aValueDeclaration()
    const { runner, cache } = await arrange([{ declaration }])

    await runner.pause([pinOf(declaration)])
    const result = runner.runLane(laneOf(declaration), noCalls, inputs)

    expect(outcomeOf(result)).toEqual(errOf({ kind: 'unavailable' }))
    expect(cache.size).toBe(0)
    expect(runner.hasUnavailable).toBe(true)
  })

  it('answers unavailable, uncached, when a closure member fails to load', async () => {
    const used = aValueDeclaration({ id: aBlueprintId('lib:blueprint/used') })
    const caller = aValueDeclaration({ uses: [{ id: used.id, minVersion: aVersion() }] })
    const { runner, cache } = await arrange([
      { declaration: caller, script: laneScript(returning('1')) },
      { declaration: used },
    ])

    await runner.pause([pinOf(caller), pinOf(used)])
    const result = runner.runLane(laneOf(caller), noCalls, inputs)

    expect(outcomeOf(result)).toEqual(errOf({ kind: 'unavailable' }))
    expect(cache.size).toBe(0)
    expect(runner.hasUnavailable).toBe(true)
  })
})
