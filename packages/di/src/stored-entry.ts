import { Slot } from './slot'

import type { RegistrationEntry } from './types'

export class StoredEntry {
  entry: RegistrationEntry<unknown>
  readonly slot = new Slot()
  readonly registrationIndex: number

  constructor(entry: RegistrationEntry<unknown>, registrationIndex: number) {
    this.entry = entry
    this.registrationIndex = registrationIndex
  }
}
