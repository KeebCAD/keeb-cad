import { match } from 'ts-pattern'

import { DuplicateRegistrationError } from './errors/duplicate-registration-error'
import { StoredEntry } from './stored-entry'
import { tokenKind } from './token'

import type { AnyTokenLike, RegistrationEntry } from './types'

export class Bindings {
  readonly #map = new Map<AnyTokenLike, StoredEntry[]>()
  #counter = 0

  commit(token: AnyTokenLike, entry: RegistrationEntry<unknown>): StoredEntry {
    const stored = new StoredEntry(entry, this.#counter++)
    const list = this.#map.get(token) ?? []
    match(tokenKind(token))
      .with('single', () => {
        if (list.length > 0) throw new DuplicateRegistrationError(token)
        this.#map.set(token, [stored])
      })
      .with('multi', () => {
        list.push(stored)
        this.#map.set(token, list)
      })
      .exhaustive()
    return stored
  }

  lookup(token: AnyTokenLike): readonly StoredEntry[] | undefined {
    return this.#map.get(token)
  }

  all(): readonly { readonly token: AnyTokenLike; readonly stored: StoredEntry }[] {
    const rows: { readonly token: AnyTokenLike; readonly stored: StoredEntry }[] = []
    for (const [token, list] of this.#map) {
      for (const stored of list) rows.push({ token, stored })
    }
    return rows
  }

  clear(): void {
    this.#map.clear()
  }
}
