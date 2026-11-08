import { QuickJS } from 'quickjs-wasi'
import { describe, expect, it, onTestFinished } from 'vitest'

import { MIB } from '../testing/a-pinned-blueprint'
import { EngineLoader } from './engine-loader'
import { StepBudget } from './step-budget'
import { vmOptions } from './vm-options'

async function aVm() {
  const module = await new EngineLoader().load()
  if (module.isErr()) throw new Error('the engine did not load')
  const vm = await QuickJS.create(vmOptions(module.value, new StepBudget()))
  onTestFinished(() => vm.dispose())
  return vm
}

describe('the engine internals the host relies on', () => {
  it('reports a pending job through qjs_is_job_pending', async () => {
    const vm = await aVm()
    const before = vm._getExports().qjs_is_job_pending()
    vm.evalCode('Promise.resolve().then(() => 1); 0').dispose()
    expect([before, vm._getExports().qjs_is_job_pending() !== 0]).toEqual([0, true])
  })

  it('grows linear memory with an allocation and does not give it back', async () => {
    const vm = await aVm()
    const before = vm._getMemory().buffer.byteLength
    vm.evalCode(`new ArrayBuffer(${String(50 * MIB)}); 0`).dispose()
    const grown = vm._getMemory().buffer.byteLength
    vm.evalCode('1 + 1').dispose()
    const after = vm._getMemory().buffer.byteLength
    expect(grown - before).toBeGreaterThanOrEqual(50 * MIB)
    expect(after).toBeGreaterThanOrEqual(grown)
  })
})
