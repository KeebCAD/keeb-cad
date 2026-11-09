import { describe, expect, it } from 'vitest'

import { fixedClockAndRandom } from './fixed-clock-and-random'

describe('fixedClockAndRandom', () => {
  it('writes a clock reading of 0', () => {
    const memory = new WebAssembly.Memory({ initial: 1 })
    new DataView(memory.buffer).setBigUint64(16, 99n, true)
    fixedClockAndRandom(memory).clock_time_get(0, 0n, 16)
    expect(new DataView(memory.buffer).getBigUint64(16, true)).toBe(0n)
  })

  it('writes zeros over exactly the buffer it is given', () => {
    const memory = new WebAssembly.Memory({ initial: 1 })
    const view = new DataView(memory.buffer)
    Array.from({ length: 16 }, (_, offset) => view.setUint8(offset, 7))
    fixedClockAndRandom(memory).random_get(8, 4)
    expect(Array.from({ length: 6 }, (_, offset) => view.getUint8(7 + offset))).toEqual([
      7, 0, 0, 0, 0, 7,
    ])
  })
})
