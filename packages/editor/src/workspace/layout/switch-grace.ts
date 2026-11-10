import { inject } from '@keeb-cad/di'
import { ModelWorkerLifecycle } from '@keeb-cad/workers'
import { useTimeoutFn } from '@vueuse/core'
import { effectScope, shallowRef, watch } from 'vue'

import { DesignLocation } from '../../router/design-location'
import { switchGraceDelayMs } from './switch-grace-delay'

export class SwitchGrace implements Disposable {
  constructor() {
    this.#scope.run(() => {
      // A set that arrives on the delay itself is still within the grace, so the timer runs 1 ms past it.
      const timer = useTimeoutFn(
        () => {
          this.#late.value = !this.#lifecycle.layoutSetArrived
        },
        switchGraceDelayMs + 1,
        { immediate: false },
      )
      watch(
        () => this.#location.workspace.getOrUndefined(),
        (next, previous) => {
          this.#late.value = false
          timer.stop()
          // Arriving on a design route is no switch, as DesignLocation sends no focus for it; and
          // only Layout draws the Layout set.
          if (next === 'layout' && previous !== undefined) timer.start()
        },
        { flush: 'sync' },
      )
      // Once the late set arrives the switch is settled, so later commits on the same workspace
      // don't gray the canvas for the moment their set takes.
      watch(
        () => this.#lifecycle.layoutSetArrived,
        (arrived) => {
          if (arrived) this.#late.value = false
        },
        { flush: 'sync' },
      )
    })
  }
  // The grace has run out since the last switch to Layout and its set for main's seq is still missing.
  get grayed(): boolean {
    return this.#late.value && !this.#lifecycle.layoutSetArrived
  }

  [Symbol.dispose](): void {
    this.#scope.stop()
  }

  readonly #location = inject(DesignLocation)
  readonly #lifecycle = inject(ModelWorkerLifecycle)
  readonly #late = shallowRef(false)
  // Detached: the service is first resolved inside some component's setup, and a scope of that
  // component's would stop the grace when it unmounts.
  readonly #scope = effectScope(true)
}
