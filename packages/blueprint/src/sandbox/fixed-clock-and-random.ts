const WASI_SUCCESS = 0

export function fixedClockAndRandom(memory: WebAssembly.Memory) {
  return {
    clock_time_get(_clockId: number, _precision: bigint, resultPointer: number): number {
      new DataView(memory.buffer).setBigUint64(resultPointer, 0n, true)
      return WASI_SUCCESS
    },
    random_get(bufferPointer: number, bufferLength: number): number {
      new Uint8Array(memory.buffer, bufferPointer, bufferLength).fill(0)
      return WASI_SUCCESS
    },
  }
}
