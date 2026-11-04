import { REGISTER_DEFAULTS } from './registration-defaults'
import { RegistrationOptions } from './registration-options'

import type { Class, OnRegistrationChange, RegistrationDefaults } from './types'

export class RegistrationBuilder<T> {
  readonly #onChange: OnRegistrationChange<T>
  readonly #defaults: RegistrationDefaults

  constructor(
    onChange: OnRegistrationChange<T>,
    defaults: RegistrationDefaults = REGISTER_DEFAULTS,
  ) {
    this.#onChange = onChange
    this.#defaults = defaults
  }

  useClass(ctor: Class<T>): RegistrationOptions<T> {
    return new RegistrationOptions<T>(() => new ctor(), this.#onChange, this.#defaults)
  }

  useFactory(factory: () => T): RegistrationOptions<T> {
    return new RegistrationOptions<T>(factory, this.#onChange, this.#defaults)
  }

  useValue(value: T): RegistrationOptions<T> {
    return new RegistrationOptions<T>(() => value, this.#onChange, this.#defaults)
  }
}
