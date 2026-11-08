import { inject } from '@keeb-cad/di'
import { Option } from '@keeb-cad/result'
import { type Workspace, workspaceSchema } from '@keeb-cad/schema'
import { ModelWorkerLifecycle } from '@keeb-cad/workers'
import * as v from 'valibot'
import type { RouteLocationNormalized, Router } from 'vue-router'

import { createEditorRouter } from './create-editor-router'

export class DesignLocation implements Disposable {
  constructor() {
    this.router.afterEach((to, from, failure) => {
      if (failure) return
      const next = DesignLocation.#workspaceOf(to)
      const previous = DesignLocation.#workspaceOf(from)
      // The first navigation focuses nothing: the lifecycle's start is given that workspace.
      if (next.isSome() && previous.isSome() && next.value !== previous.value) {
        this.#lifecycle.focus(next.value)
      }
    })
  }

  readonly router: Router = createEditorRouter()

  // None off a design route.
  get workspace(): Option<Workspace> {
    return DesignLocation.#workspaceOf(this.router.currentRoute.value)
  }

  async openWorkspace(workspace: Workspace): Promise<void> {
    await this.router.push({ name: workspace, params: this.router.currentRoute.value.params })
  }

  // A router left listening would answer a later hash change after the container is gone.
  [Symbol.dispose](): void {
    this.router.listening = false
  }

  readonly #lifecycle = inject(ModelWorkerLifecycle)

  static #workspaceOf(route: RouteLocationNormalized): Option<Workspace> {
    return v.is(workspaceSchema, route.name) ? Option.some(route.name) : Option.none()
  }
}
