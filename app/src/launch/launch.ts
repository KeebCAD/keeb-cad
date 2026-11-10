import { NewDesign, OpenStoredDesign } from '@keeb-cad/commands'
import { DesignStore } from '@keeb-cad/design'
import { inject, InjectorToken } from '@keeb-cad/di'
import { DesignLocation, mountEditor } from '@keeb-cad/editor'
import { InvariantError } from '@keeb-cad/result'
import { type Id, idSchema } from '@keeb-cad/schema'
import { DesignStorage } from '@keeb-cad/storage'
import { ModelWorkerLifecycle, type Spawn } from '@keeb-cad/workers'
import * as v from 'valibot'

import { devSeeds } from './tokens'

export class Launch {
  async run(selector: string, spawn: Spawn): Promise<void> {
    const router = mountEditor(selector, this.#injector)
    await router.isReady()
    const parsed = v.safeParse(idSchema, router.currentRoute.value.params.id)
    const requested = parsed.success ? parsed.output : undefined
    const workspace = this.#location.workspace.getOr('layout')

    const id = await this.#open(requested)

    await router.replace({ name: workspace, params: { id } })
    this.#lifecycle.start(spawn, workspace)
  }

  readonly #injector = inject(InjectorToken)
  readonly #location = inject(DesignLocation)
  readonly #store = inject(DesignStore)
  readonly #storage = inject(DesignStorage)
  readonly #lifecycle = inject(ModelWorkerLifecycle)
  readonly #seeds = inject(devSeeds)

  async #open(requested: Id | undefined): Promise<Id> {
    const seed = this.#seeds.find((candidate) => candidate.requested())
    if (seed !== undefined) {
      await seed.open()
      return this.#openId()
    }
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
