import { STEP_BUDGET } from './budgets'

export class StepBudget {
  /** One interrupt-handler call; true stops the run. */
  tick(): boolean {
    this.#used += 1
    return this.exhausted
  }

  get exhausted(): boolean {
    return this.#used > STEP_BUDGET
  }

  reset(): void {
    this.#used = 0
  }

  #used = 0
}
