import type { Slot } from './slot'

export async function disposeSlots(slots: readonly Slot[]): Promise<unknown[]> {
  const errors: unknown[] = []
  for (const slot of slots) {
    try {
      await slot.dispose()
    } catch (error) {
      errors.push(error)
    }
  }
  return errors
}

export async function disposeInstance(instance: unknown): Promise<void> {
  if (instance == null || (typeof instance !== 'object' && typeof instance !== 'function')) return
  const asyncDispose = (instance as { [Symbol.asyncDispose]?: () => Promise<void> })[
    Symbol.asyncDispose
  ]
  if (typeof asyncDispose === 'function') {
    await asyncDispose.call(instance)
    return
  }
  const syncDispose = (instance as { [Symbol.dispose]?: () => void })[Symbol.dispose]
  if (typeof syncDispose === 'function') {
    syncDispose.call(instance)
  }
}
