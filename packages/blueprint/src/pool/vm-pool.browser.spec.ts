import { Container } from '@keeb-cad/di'
import { describe, expect, it, onTestFinished } from 'vitest'

import type { HandleTable } from '../lane/handle-table'
import type { StageCalls } from '../lane/types'
import {
  aPin,
  laneFailed,
  laneOf,
  MIB,
  noArgs,
  withInputs,
  withPulls,
  noCalls,
  okValue,
  returning,
} from '../testing/a-pinned-blueprint'
import { blueprintWorkerModule } from './blueprint-worker-module'
import type { BlueprintVm } from './blueprint-vm'
import type { PinnedBlueprint } from './types'
import { VmPool } from './vm-pool'
import { errOf, outcomeOf } from '../testing/outcome'

const small = returning('1')
const unavailable = errOf({ kind: 'unavailable' })

async function arrange(pins: readonly PinnedBlueprint[]) {
  const container = new Container().addModule(blueprintWorkerModule)
  const pool = container.resolve(VmPool)
  await pool.pause(pins)
  onTestFinished(() => pool[Symbol.dispose]())
  return pool
}

const vmOf = (pool: VmPool, pin: PinnedBlueprint) =>
  pool
    .vmFor(pin.declaration.id, pin.declaration.version)
    .match<BlueprintVm | null>({ some: (vm) => vm, none: () => null })

async function arrangeWithVm(pin: PinnedBlueprint) {
  const pool = await arrange([pin])
  const vm = pool.vmFor(pin.declaration.id, pin.declaration.version).match({
    some: (found) => found,
    none: () => {
      throw new Error('the pause created no VM')
    },
  })
  return { pool, vm }
}

const runsBetweenBaselineAndLast = 97

describe('VmPool', () => {
  it('answers unavailable for a lane it holds no VM for', async () => {
    const pool = await arrange([])
    expect(outcomeOf(pool.runLane(laneOf(aPin(small)), noCalls, noArgs))).toEqual(unavailable)
  })

  describe('replacement', () => {
    it('keeps the VM of a small lane through a pause', async () => {
      const pin = aPin(small)
      const pool = await arrange([pin])
      const before = vmOf(pool, pin)
      pool.runLane(laneOf(pin), noCalls, noArgs)
      await pool.pause([pin])
      expect(vmOf(pool, pin)).toBe(before)
      expect(outcomeOf(pool.runLane(laneOf(pin), noCalls, noArgs))).toEqual(okValue(1))
    })

    it('replaces a VM that grew past the limit in the next pause', async () => {
      const pin = aPin(`new ArrayBuffer(${String(50 * MIB)}); ${small}`)
      const pool = await arrange([pin])
      const before = vmOf(pool, pin)
      expect(outcomeOf(pool.runLane(laneOf(pin), noCalls, noArgs))).toEqual(okValue(1))
      await pool.pause([pin])
      expect(vmOf(pool, pin)).not.toBe(before)
      expect(outcomeOf(pool.runLane(laneOf(pin), noCalls, noArgs))).toEqual(okValue(1))
    })

    it('disposes the VM of a version no longer pinned', async () => {
      const pin = aPin(small)
      const pool = await arrange([pin])
      const vm = vmOf(pool, pin)
      await pool.pause([])
      expect(vmOf(pool, pin)).toBeNull()
      expect(vm?.isDead).toBe(true)
    })

    it('replaces the VM when a pin changes a nested version', async () => {
      const nested = aPin(small, { id: 'lib:blueprint/nested', version: 1 })
      const newer = aPin(small, { id: 'lib:blueprint/nested', version: 2 })
      const pin = aPin(small, {}, [nested])
      const pool = await arrange([pin])
      const before = vmOf(pool, pin)
      await pool.pause([{ ...pin, closure: [newer] }])
      expect(vmOf(pool, pin)).not.toBe(before)
    })
  })

  describe('a pending job', () => {
    it('fails the lane, then answers unavailable until a pause replaces the VM', async () => {
      const pin = aPin(`Promise.resolve().then(() => 1); ${small}`)
      const pool = await arrange([pin])
      expect(outcomeOf(pool.runLane(laneOf(pin), noCalls, noArgs))).toEqual(
        laneFailed({ cause: 'pending-job' }),
      )
      expect(outcomeOf(pool.runLane(laneOf(pin), noCalls, noArgs))).toEqual(unavailable)
      await pool.pause([pin])
      expect(outcomeOf(pool.runLane(laneOf(pin), noCalls, noArgs))).toEqual(
        laneFailed({ cause: 'pending-job' }),
      )
    })
  })

  describe('the API version', () => {
    it.each([
      ['older than the app', 0],
      ['the same as the app', 1],
    ])('runs a blueprint %s', async (_role, apiVersion) => {
      const pin = aPin(small, { apiVersion })
      const pool = await arrange([pin])
      expect(outcomeOf(pool.runLane(laneOf(pin), noCalls, noArgs))).toEqual(okValue(1))
    })

    it('does not run a blueprint newer than the app', async () => {
      const pin = aPin(small, { apiVersion: 2 })
      const pool = await arrange([pin])
      expect(outcomeOf(pool.runLane(laneOf(pin), noCalls, noArgs))).toEqual(
        errOf({ kind: 'blueprint-api-too-new', blueprint: pin.declaration.id }),
      )
    })

    it('does not run a blueprint whose closure holds a newer one', async () => {
      const nested = aPin(small, { id: 'lib:blueprint/nested', apiVersion: 2 })
      const pin = aPin(small, {}, [nested])
      const pool = await arrange([pin])
      expect(outcomeOf(pool.runLane(laneOf(pin), noCalls, noArgs))).toEqual(
        errOf({ kind: 'blueprint-api-too-new', blueprint: 'lib:blueprint/nested' }),
      )
    })
  })

  describe('handle tables', () => {
    const shapes: StageCalls = {
      ...noCalls,
      operations: {
        make: (_args, handles: HandleTable) => handles.add('shape'),
        read: ([handle], handles: HandleTable) =>
          handles.get(Number(handle)).match({ some: () => 'known', none: () => 'unknown' }),
      },
    }

    it('keeps the object count level across many runs with handles and op results', async () => {
      const pin = aPin(`op.make(); op.read(1); ${small}`)
      const { pool, vm } = await arrangeWithVm(pin)
      const lane = laneOf(pin)
      pool.runLane(lane, shapes, noArgs)
      pool.runLane(lane, shapes, noArgs)
      const afterTwoRuns = vm.objectCount
      Array.from({ length: runsBetweenBaselineAndLast }, () => pool.runLane(lane, shapes, noArgs))
      expect(outcomeOf(pool.runLane(lane, shapes, noArgs))).toEqual(okValue(1))
      expect(vm.objectCount).toBe(afterTwoRuns)
    })

    it('lets a caller put a handle in args, readable in that run and gone in the next', async () => {
      const expectedValue = 'the pulled shape'
      const reading: StageCalls = {
        ...noCalls,
        operations: {
          read: ([handle], handles: HandleTable) =>
            handles.get(Number(handle)).match({ some: (value) => value, none: () => 'unknown' }),
        },
      }
      const pin = aPin(returning('op.read(args.pulls.shape)'))
      const pool = await arrange([pin])
      const lane = laneOf(pin)
      let shape = 0
      const first = pool.runLane(lane, reading, (handles) => {
        shape = handles.add(expectedValue)
        return withPulls({ shape })
      })
      expect(outcomeOf(first)).toEqual(okValue(expectedValue))
      expect(outcomeOf(pool.runLane(lane, reading, () => withPulls({ shape })))).toEqual(
        okValue('unknown'),
      )
    })

    it('does not carry handles from one run into the next', async () => {
      const pin = aPin(
        `if (args.inputs.handle === undefined) ${returning('op.make()')}; ${returning('op.read(args.inputs.handle)')}`,
      )
      const pool = await arrange([pin])
      const lane = laneOf(pin)
      const handle = pool
        .runLane(lane, shapes, noArgs)
        .match({ ok: ({ outputs }) => outputs.value, err: () => null })
      expect(outcomeOf(pool.runLane(lane, shapes, withInputs({ handle })))).toEqual(
        okValue('unknown'),
      )
    })
  })
})
