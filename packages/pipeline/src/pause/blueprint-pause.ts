import { LaneRunner } from '@keeb-cad/blueprint/worker'
import { inject } from '@keeb-cad/di'

import { nextBackoffDelay } from './next-backoff-delay'
import type { PinSource, RunStages } from './types'

export class BlueprintPause {
  /** An edit: pauses at once and restarts the backoff, because an edit is a new attempt. */
  enter(pins: PinSource, runStages: RunStages): void {
    clearTimeout(this.#timer)
    this.#timer = undefined
    this.#delayMs = undefined
    this.#pins = pins
    this.#runStages = runStages
    void this.#run()
  }

  readonly #runner = inject(LaneRunner)
  #pins: PinSource = () => []
  #runStages: RunStages = () => {}
  #timer: ReturnType<typeof setTimeout> | undefined
  #delayMs: number | undefined
  #running = false
  #again = false

  // The pool's pause is not re-entrant, so an edit arriving during one queues a single re-run.
  async #run(): Promise<void> {
    if (this.#running) {
      this.#again = true
      return
    }
    this.#running = true
    let paused
    do {
      this.#again = false
      paused = await this.#runner.pause(this.#pins())
    } while (this.#again)
    this.#running = false
    this.#runStages()
    if (paused.isErr() || this.#runner.hasUnavailable) this.#scheduleRetry()
    else this.#delayMs = undefined
  }

  #scheduleRetry(): void {
    this.#delayMs = nextBackoffDelay(this.#delayMs)
    this.#timer = setTimeout(() => {
      this.#timer = undefined
      void this.#run()
    }, this.#delayMs)
  }
}
