import { Lifetime } from './lifetime'

import type { RegistrationDefaults } from './types'

export const REGISTER_DEFAULTS: RegistrationDefaults = {
  lifetime: Lifetime.Container,
  eager: false,
}
