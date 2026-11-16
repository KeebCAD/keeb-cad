import { InvariantError, Option } from '@keeb-cad/result'
import type { Frozen, RoutingFile } from '@keeb-cad/schema'

import type { Changed } from '../patching/types'
import type { PatchReplay, UndoEntry } from './types'

export class UndoHistory {
  reset(routing: Frozen<RoutingFile>): void {
    this.#routings = [routing]
    this.#entries = []
    this.#cursor = 0
    this.#session = Option.none()
  }

  record(changed: Changed, routing: Frozen<RoutingFile>, coalesce?: string): void {
    const open = this.#session.getOrUndefined()
    const last = this.#entries.at(-1)
    if (coalesce !== undefined && open === coalesce && last !== undefined) {
      this.#entries[this.#entries.length - 1] = {
        coalesce: last.coalesce,
        forward: [...last.forward, ...changed.patches],
        inverse: [...changed.inverse, ...last.inverse],
      }
      this.#routings[this.#cursor] = routing
      return
    }
    this.#entries = this.#entries.slice(0, this.#cursor)
    this.#routings = this.#routings.slice(0, this.#cursor + 1)
    const key = Option.fromNullable(coalesce)
    this.#entries.push({ coalesce: key, forward: changed.patches, inverse: changed.inverse })
    this.#routings.push(routing)
    this.#cursor += 1
    this.#session = key
  }

  undo(): Option<PatchReplay> {
    const entry = this.#entries[this.#cursor - 1]
    if (entry === undefined) return Option.none()
    this.#cursor -= 1
    return Option.some(this.#replay(entry.inverse))
  }

  redo(): Option<PatchReplay> {
    const entry = this.#entries[this.#cursor]
    if (entry === undefined) return Option.none()
    this.#cursor += 1
    return Option.some(this.#replay(entry.forward))
  }

  acceptRouting(routing: Frozen<RoutingFile>): void {
    this.#routings[this.#cursor] = routing
  }

  // One routing reference per undo record: the record reset makes, then one per entry.
  #routings: Frozen<RoutingFile>[] = []
  #entries: UndoEntry[] = []
  // How many entries are applied, which is also the index of the current undo record.
  #cursor = 0
  #session: Option<string> = Option.none()

  #replay(patches: PatchReplay['patches']): PatchReplay {
    this.#session = Option.none()
    const routing = this.#routings[this.#cursor]
    // Every entry has the undo record it reaches, so the cursor always names a held one.
    if (routing === undefined) throw new InvariantError('An undo record has no routing file.')
    return { patches, routing }
  }
}
