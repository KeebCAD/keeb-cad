import { REGISTER_DEFAULTS } from './registration-defaults'

import type { Lifetime } from './lifetime'
import type { OnRegistrationChange, RegistrationDefaults } from './types'

export class RegistrationOptions<T> {
  readonly #factory: () => T
  readonly #onChange: OnRegistrationChange<T>
  #lifetime: Lifetime
  #eager: boolean

  constructor(
    factory: () => T,
    onChange: OnRegistrationChange<T>,
    defaults: RegistrationDefaults = REGISTER_DEFAULTS,
  ) {
    this.#factory = factory
    this.#onChange = onChange
    this.#lifetime = defaults.lifetime
    this.#eager = defaults.eager
    this.#notify()
  }

  lifetime(value: Lifetime): this {
    this.#lifetime = value
    this.#notify()
    return this
  }

  eager(): this {
    this.#eager = true
    this.#notify()
    return this
  }

  #notify(): void {
    this.#onChange({
      factory: this.#factory,
      lifetime: this.#lifetime,
      eager: this.#eager,
    })
  }
}
