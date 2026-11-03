export class DuplicateCommandIdError extends Error {
  readonly ids: readonly string[]

  constructor(ids: readonly string[]) {
    super(`Command ids registered more than once: ${ids.join(', ')}.`)
    this.name = 'DuplicateCommandIdError'
    this.ids = ids
  }
}
