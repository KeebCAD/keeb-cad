import { describe, expect, it } from 'vitest'

import { Container } from '@keeb-cad/di'
import { isProxy, reactive } from '@keeb-cad/reactive'

import { designModule } from './module'
import { DesignState, type CommitEvent } from './state'

const meta = { id: 'my-board', name: 'My board', form: { type: 'split', board: 'mirrored' } }

function setup() {
  const state = new Container().addModules([designModule]).resolve(DesignState)
  const events: CommitEvent[] = []
  state.onCommit((event) => events.push(event))
  return { state, events }
}

/** Every object in `value` is frozen and none is a Vue proxy. */
function expectDeeplyFrozen(value: unknown): void {
  if (value === null || typeof value !== 'object') return
  expect(Object.isFrozen(value)).toBe(true)
  expect(isProxy(value)).toBe(false)
  for (const field of Object.values(value)) expectDeeplyFrozen(field)
}

describe('DesignState.replaceDesign', () => {
  it('loads a meta-only design, deeply frozen, and emits the whole value', () => {
    const { state, events } = setup()

    expect(state.replaceDesign({ meta })).toEqual({ ok: true, value: undefined })

    expect(state.design).toEqual({ meta })
    expectDeeplyFrozen(state.design)
    expect(state.seq).toBe(1)
    expect(events).toEqual([
      { kind: 'replace', design: state.design, seq: 1, revision: state.revision },
    ])
    expect(state.revision).toMatch(/^[0-9a-f]{64}$/)
  })

  it('copies a Vue reactive value and leaves the caller’s object unfrozen', () => {
    const { state } = setup()
    const input = reactive({ meta: { ...meta, form: { ...meta.form } } })

    state.replaceDesign(input)

    expectDeeplyFrozen(state.design)
    expect(Object.isFrozen(input)).toBe(false)
    expect(Object.isFrozen(input.meta)).toBe(false)
  })

  it('refuses an unknown form with design-invalid at meta.form.type', () => {
    const { state, events } = setup()

    const result = state.replaceDesign({ meta: { ...meta, form: { type: 'triangle' } } })

    expect(result.ok).toBe(false)
    expect(!result.ok && result.error.kind).toBe('design-invalid')
    expect(!result.ok && result.error.issues.map(({ path }) => path)).toEqual([
      ['meta', 'form', 'type'],
    ])
    expect(state.design).toBeUndefined()
    expect(state.seq).toBe(0)
    expect(events).toEqual([])
  })

  it('refuses an id that is not kebab-case', () => {
    const { state } = setup()

    const result = state.replaceDesign({ meta: { ...meta, id: 'My Board' } })

    expect(!result.ok && result.error.issues.map(({ path }) => path)).toEqual([['meta', 'id']])
  })

  it('gives the same design value the same revision, whatever its key order', () => {
    const { state } = setup()
    state.replaceDesign({ meta })
    const first = state.revision

    state.replaceDesign({
      meta: { form: { board: 'mirrored', type: 'split' }, name: 'My board', id: 'my-board' },
    })

    expect(state.seq).toBe(2)
    expect(state.revision).toBe(first)
  })

  it('stops calling a listener once it unsubscribes', () => {
    const state = new Container().addModules([designModule]).resolve(DesignState)
    const events: CommitEvent[] = []
    const unsubscribe = state.onCommit((event) => events.push(event))

    unsubscribe()
    state.replaceDesign({ meta })

    expect(events).toEqual([])
  })
})
