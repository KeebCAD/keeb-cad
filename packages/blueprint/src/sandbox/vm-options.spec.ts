import { Intrinsics } from 'quickjs-wasi'
import { describe, expect, it } from 'vitest'

import { StepBudget } from './step-budget'
import { vmOptions } from './vm-options'

const options = () => vmOptions({} as WebAssembly.Module, new StepBudget())

const expectedMemoryLimit = 64 * 1024 * 1024
const expectedStackSize = 256 * 1024
describe('vmOptions', () => {
  it('sets the memory limit and the stack size to their budgets', () => {
    expect(options()).toMatchObject({
      memoryLimit: expectedMemoryLimit,
      maxStackSize: expectedStackSize,
    })
  })

  it.each([
    ['Date', Intrinsics.DATE],
    ['WeakRef', Intrinsics.WEAK_REF],
    ['performance', Intrinsics.PERFORMANCE],
    ['DOMException', Intrinsics.DOM_EXCEPTION],
    ['atob', Intrinsics.ATOB_BTOA],
  ])('leaves out %s', (_name, flag) => {
    const { intrinsics } = options()
    expect(intrinsics).toBeDefined()
    expect((intrinsics as number) & flag).toBe(0)
  })
})
