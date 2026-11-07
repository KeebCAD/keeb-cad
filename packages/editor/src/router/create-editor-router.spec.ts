import { describe, expect, it, onTestFinished } from 'vitest'

import { createEditorRouter } from './create-editor-router'

// A router left listening would answer a later test's hash change.
function arrange() {
  const router = createEditorRouter()
  onTestFinished(() => {
    router.listening = false
    history.replaceState(null, '', location.pathname + location.search)
  })
  return router
}

describe("the editor router's workspace", () => {
  it.each([
    ['the first option', '/design/corne/layout'],
    ['the last option', '/design/corne/firmware'],
  ])('keeps %s', async (_role, path) => {
    const router = arrange()

    await router.push(path)

    expect(router.currentRoute.value.fullPath).toBe(path)
  })

  it.each([
    ['an unknown one', '/design/corne/bogus'],
    ['one in the wrong case', '/design/corne/Layout'],
    ['a missing one', '/design/corne'],
  ])('replaces %s with layout', async (_role, path) => {
    const router = arrange()

    await router.push(path)

    expect(router.currentRoute.value.fullPath).toBe('/design/corne/layout')
  })

  it('replaces an unknown one navigated to in session with layout', async () => {
    const router = arrange()
    await router.push('/design/a/layout')

    await router.push('/design/a/bogus')

    expect(router.currentRoute.value.fullPath).toBe('/design/a/layout')
    expect(location.hash).toBe('#/design/a/layout')
  })
})
