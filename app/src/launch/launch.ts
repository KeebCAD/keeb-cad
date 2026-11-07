import { NewDesign, OpenStoredDesign } from '@keeb-cad/commands'
import { DesignStore } from '@keeb-cad/design'
import { inject, InjectorToken } from '@keeb-cad/di'
import { mountEditor } from '@keeb-cad/editor'
import { InvariantError } from '@keeb-cad/result'
import { type Id, idSchema, type Workspace, workspaceSchema } from '@keeb-cad/schema'
import { DesignStorage } from '@keeb-cad/storage'
import { ModelWorkerLifecycle, type Spawn } from '@keeb-cad/workers'
import * as v from 'valibot'

export class Launch {
  async run(selector: string, spawn: Spawn): Promise<void> {
    const location = mountEditor(selector, this.#injector)
    await location.isReady()
    const { name, params } = location.currentRoute.value
    const onDesign = name === 'design'
    const parsed = v.safeParse(idSchema, params.id)
    const requested = onDesign && parsed.success ? parsed.output : undefined
    // The router's guard has already replaced a missing or unknown workspace with layout.
    const workspace: Workspace = onDesign ? v.parse(workspaceSchema, params.workspace) : 'layout'

    const id = await this.#open(requested)

    await location.replace({ name: 'design', params: { id, workspace } })
    this.#lifecycle.start(spawn, workspace)
  }

  readonly #injector = inject(InjectorToken)
  readonly #store = inject(DesignStore)
  readonly #storage = inject(DesignStorage)
  readonly #lifecycle = inject(ModelWorkerLifecycle)

  async #open(requested: Id | undefined): Promise<Id> {
    if (requested !== undefined) {
      const opened = await this.#store.run(OpenStoredDesign, { id: requested })
      if (opened.isOk()) return this.#openId()
      if (Launch.#storageFailed(opened.error.kind)) return this.#newDesign()
    }
    const designs = await this.#storage.listDesigns()
    if (designs.isErr()) return this.#newDesign()
    const [newest] = designs.value
    if (newest === undefined || newest.id === requested) return this.#newDesign()
    const opened = await this.#store.run(OpenStoredDesign, { id: newest.id })
    return opened.isOk() ? this.#openId() : this.#newDesign()
  }

  static #storageFailed(kind: string): boolean {
    return kind === 'storage-unavailable' || kind === 'quota-exceeded'
  }

  async #newDesign(): Promise<Id> {
    const created = await this.#store.run(NewDesign, {})
    // NewDesign builds one fixed design its own spec proves valid.
    if (created.isErr()) throw new InvariantError('A new design failed to open at launch.')
    return this.#openId()
  }

  #openId(): Id {
    const current = this.#store.current
    if (current.isNone()) throw new InvariantError('Launch opened a design but none is committed.')
    return current.value.design.meta.id
  }
}
