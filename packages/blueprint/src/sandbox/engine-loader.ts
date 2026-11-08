import { AsyncResult, Result } from '@keeb-cad/result'
import wasmUrl from 'quickjs-wasi/quickjs.wasm?url'

import type { EngineUnavailable } from './types'

export class EngineLoader {
  load(): AsyncResult<WebAssembly.Module, EngineUnavailable> {
    this.#compiled ??= this.#compile()
    return AsyncResult._fromPromiseOfResult(this.#forget(this.#compiled))
  }

  async #compile(): Promise<Result<WebAssembly.Module, EngineUnavailable>> {
    return AsyncResult.fromPromise(this.#fetchAndCompile(), (): EngineUnavailable => ({
      kind: 'engine-unavailable',
    }))
  }

  async #fetchAndCompile(): Promise<WebAssembly.Module> {
    return WebAssembly.compileStreaming(await fetch(wasmUrl))
  }

  // A failed fetch may succeed next time; only a compiled module is kept.
  async #forget(
    compiled: Promise<Result<WebAssembly.Module, EngineUnavailable>>,
  ): Promise<Result<WebAssembly.Module, EngineUnavailable>> {
    const result = await compiled
    if (result.isErr()) this.#compiled = undefined
    return result
  }

  #compiled: Promise<Result<WebAssembly.Module, EngineUnavailable>> | undefined
}
