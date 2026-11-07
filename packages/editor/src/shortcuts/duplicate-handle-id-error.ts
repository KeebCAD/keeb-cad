export class DuplicateHandleIdError extends Error {
  readonly ids: readonly string[]

  constructor(ids: readonly string[]) {
    super(
      `Handle ids registered more than once across commands, actions and UiActions: ${ids.join(', ')}.`,
    )
    this.name = 'DuplicateHandleIdError'
    this.ids = ids
  }
}
