export class DuplicateInputBuilderError extends Error {
  readonly ids: readonly string[]

  constructor(ids: readonly string[]) {
    super(`Input builders registered more than once for: ${ids.join(', ')}.`)
    this.name = 'DuplicateInputBuilderError'
    this.ids = ids
  }
}
