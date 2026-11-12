import { type CommitEvent, DesignStore, parse } from '@keeb-cad/design'
import { inject } from '@keeb-cad/di'
import type { Result } from '@keeb-cad/result'
import { watchDebounced } from '@vueuse/core'
import { match, P } from 'ts-pattern'
import { toRaw } from 'vue'

import { Flows } from '../flows/flows'
import type { FlowEvent } from '../flows/types'
import { Invoke } from '../invoke/invoke'
import type { InvokeEvent } from '../invoke/types'
import { commitsLayerId, flowsLayerId, inspectorId, invocationsLayerId } from './devtools-ids'
import { stateRefreshDelayMs } from './state-refresh-delay'
import { inspectables } from './tokens'
import type { EditPayload, Inspectable, InspectableField, PluginHost } from './types'

export class DevtoolsPlugin implements Disposable {
  // The kit runs setup per app and again on replay, each with a new api, and adds every inspector
  // it is given: a second pass would list them all twice.
  setup(api: PluginHost): void {
    if (this.#connected) return
    this.#connected = true

    api.addInspector({ id: inspectorId, label: 'Services' })
    api.addTimelineLayer({ id: invocationsLayerId, label: 'Invocations', color: 0x42_b8_83 })
    api.addTimelineLayer({ id: commitsLayerId, label: 'Commits', color: 0x4f_7c_ac })
    api.addTimelineLayer({ id: flowsLayerId, label: 'Flows', color: 0xc0_7a_d8 })
    this.#answerInspector(api)
    this.#stops.push(
      watchDebounced(
        () => this.#inspectables.map(({ fields }) => this.#values(fields)),
        () => {
          api.sendInspectorState(inspectorId)
        },
        { debounce: stateRefreshDelayMs },
      ),
      this.#invoke.events.on('invoke', (event) => {
        this.#addInvocation(api, event)
      }),
      this.#store.events.on('commit', (event) => {
        this.#addCommit(api, event)
      }),
      this.#flows.events.on('flow', (event) => {
        this.#addFlow(api, event)
      }),
    )
  }

  [Symbol.dispose](): void {
    for (const stop of this.#stops) stop()
  }

  readonly #inspectables = inject(inspectables)
  readonly #invoke = inject(Invoke)
  readonly #store = inject(DesignStore)
  readonly #flows = inject(Flows)
  readonly #stops: (() => void)[] = []
  #connected = false

  #answerInspector(api: PluginHost): void {
    api.on.getInspectorTree((payload) => {
      if (payload.inspectorId !== inspectorId) return
      payload.rootNodes = this.#inspectables.map(({ id, label }) => ({ id, label }))
    })
    api.on.getInspectorState((payload) => {
      if (payload.inspectorId !== inspectorId) return
      const inspectable = this.#inspectable(payload.nodeId)
      if (inspectable === undefined) return
      payload.state = { fields: this.#rows(inspectable) }
      // The kit stamps a pushed state with this node, and the panel ignores one that names another.
      api.selectInspectorNode(inspectorId, payload.nodeId)
    })
    api.on.editInspectorState((payload) => {
      if (payload.inspectorId !== inspectorId) return
      this.#edit(payload)
      // A refused value changes nothing the watch sees, yet the overlay shows what was typed.
      api.sendInspectorState(inspectorId)
    })
  }

  // The panel edits a list item or an object's member by its full path, so the kit's own editor
  // applies the edit to a copy and the field's schema judges the whole value that results.
  #edit(payload: EditPayload): void {
    const [key, ...nested] = payload.path
    if (key === undefined || (nested.length === 0 && payload.state.remove === true)) return
    const field = this.#inspectable(payload.nodeId)?.fields[key]
    if (field === undefined || !('set' in field)) return
    const draft: Record<string, unknown> = {}
    try {
      draft[key] = structuredClone(toRaw(field.get()))
      payload.set(draft)
    } catch {
      // A value that can't be copied, or a path through a primitive, has nothing to edit.
      return
    }
    parse(field.schema, draft[key]).tap((value) => {
      field.set(value)
    })
  }

  #inspectable(id: string): Inspectable | undefined {
    return this.#inspectables.find((entry) => entry.id === id)
  }

  #values(fields: Inspectable['fields']): unknown[] {
    return Object.values(fields).map((field: InspectableField) => field.get())
  }

  #rows({ fields }: Inspectable) {
    return Object.entries(fields).map(([key, field]) => ({
      key,
      value: field.get(),
      editable: 'set' in field,
    }))
  }

  #addInvocation(api: PluginHost, { id, label, input, result }: InvokeEvent): void {
    api.addTimelineEvent({
      layerId: invocationsLayerId,
      event: {
        time: api.now(),
        // The id, not the label: a UiAction and the command it runs often share one label.
        title: id,
        subtitle: this.#outcome(result),
        data: { label, input, result: result.match({ ok: () => 'ok', err: (error) => error }) },
      },
    })
  }

  #outcome(result: Result<void, unknown>): string {
    return result.match({
      ok: () => 'ok',
      err: (error) =>
        match(error)
          .with({ kind: P.string }, ({ kind }) => kind)
          .otherwise(() => 'error'),
    })
  }

  #addCommit(api: PluginHost, event: CommitEvent): void {
    const data = this.#commitData(event)
    api.addTimelineEvent({
      layerId: commitsLayerId,
      event: {
        time: api.now(),
        title: `seq ${data.seq}`,
        subtitle: event.kind,
        data,
      },
    })
  }

  // A whole commit's design stays in the inspector: a copy per event would be the one costly row.
  #commitData(event: CommitEvent) {
    return match(event)
      .with({ kind: 'patches' }, ({ seq, revision, patches }) => ({ seq, revision, patches }))
      .with({ kind: 'whole' }, ({ committed: { seq, revision } }) => ({ seq, revision }))
      .exhaustive()
  }

  #addFlow(api: PluginHost, event: FlowEvent): void {
    api.addTimelineEvent({
      layerId: flowsLayerId,
      event: {
        time: api.now(),
        title: event.entry.handle.name,
        subtitle: event.kind === 'cancelled' ? `cancelled: ${event.reason}` : event.kind,
        data: { entry: event.entry.id },
      },
    })
  }
}
