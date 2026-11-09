import { Result } from '@keeb-cad/result'

import type { HandleTable } from './handle-table'
import type { OperationTable } from './types'

export class HostCallWrapper {
  constructor(operations: OperationTable, handles: HandleTable) {
    this.#operations = operations
    this.#handles = handles
  }

  /** Runs one operation; the value is its one JSON string, the error a message for the guest. */
  call(name: string, argsJson: string): Result<string, string> {
    if (!Object.hasOwn(this.#operations, name)) return Result.err(`no operation named ${name}`)
    const operation = this.#operations[name]
    return operation === undefined
      ? Result.err(`no operation named ${name}`)
      : Result.fromThrowing(
          () => JSON.stringify(operation(JSON.parse(argsJson) as unknown[], this.#handles) ?? null),
          (cause) => (cause instanceof Error ? cause.message : String(cause)),
        )
  }

  readonly #operations: OperationTable
  readonly #handles: HandleTable
}
