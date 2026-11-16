import { Container } from '@keeb-cad/di'
import { corneyIslandLayout, corneyIslandTestOverrides } from '@keeb-cad/reference-designs/scripts'
import { afterEach, describe, expect, it, onTestFinished } from 'vitest'
import { page } from 'vitest/browser'

import { Launch } from './launch/launch'
import { arrangeStore } from './testing/arrange-store'
import { runSteps } from './testing/run-steps'

// The slot corneyIslandTestOverrides removes on the right.
const REMOVED = 'thumbfan-far-home'
// The worker's first load has Vite transform its whole module graph on demand, which took over
// two seconds while the rest of the suite ran beside it.
const FIRST_LOAD = { timeout: 10_000 }

const key = (name: string) => page.getByRole('button', { name, exact: true })

// Launched on empty storage with the real model worker, so a new design is open on Layout.
async function arrange() {
  history.replaceState(null, '', location.pathname + location.search)
  const container = new Container()
  const store = await arrangeStore(container)
  const root = document.createElement('div')
  root.id = `both-halves-${crypto.randomUUID()}`
  document.body.append(root)
  onTestFinished(() => {
    ;(root as HTMLElement & { __vue_app__?: { unmount(): void } }).__vue_app__?.unmount()
    root.remove()
  })
  await container.resolve(Launch).run(`#${root.id}`, () => {
    const worker = new Worker(new URL('model.worker.ts', import.meta.url), { type: 'module' })
    onTestFinished(() => worker.terminate())
    return worker
  })
  return { store }
}

// How a key is drawn: filled or not, and with a dashed or a solid outline.
function drawnAs(name: string) {
  const style = getComputedStyle(key(name).element())
  return { filled: style.fill !== 'none', dashed: style.strokeDasharray !== 'none' }
}

afterEach(() => {
  localStorage.clear()
})

describe('both halves on the Layout canvas', () => {
  it("draws the right key an override removed as unfitted, its left key fitted, after Corney's script", async () => {
    const { store } = await arrange()

    runSteps(store, [...corneyIslandLayout, ...corneyIslandTestOverrides])

    await expect
      .poll(() => drawnAs(`right/${REMOVED}`), FIRST_LOAD)
      .toEqual({
        filled: false,
        dashed: true,
      })
    expect(drawnAs(`left/${REMOVED}`)).toEqual({ filled: true, dashed: false })
  })
})
