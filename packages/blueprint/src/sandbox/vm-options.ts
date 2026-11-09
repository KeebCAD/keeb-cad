import { Intrinsics, type QuickJSOptions } from 'quickjs-wasi'

import { MAX_STACK_BYTES, MEMORY_LIMIT_BYTES } from './budgets'
import { fixedClockAndRandom } from './fixed-clock-and-random'
import type { StepBudget } from './step-budget'

const REMOVED_INTRINSICS =
  Intrinsics.DATE |
  Intrinsics.WEAK_REF |
  Intrinsics.PERFORMANCE |
  Intrinsics.DOM_EXCEPTION |
  Intrinsics.ATOB_BTOA

export function vmOptions(wasm: WebAssembly.Module, budget: StepBudget): QuickJSOptions {
  return {
    wasm,
    // >>> 0: JS bitwise results are signed, and ALL sets the top bit.
    intrinsics: (Intrinsics.ALL & ~REMOVED_INTRINSICS) >>> 0,
    wasi: fixedClockAndRandom,
    memoryLimit: MEMORY_LIMIT_BYTES,
    maxStackSize: MAX_STACK_BYTES,
    interruptHandler: () => budget.tick(),
  }
}
