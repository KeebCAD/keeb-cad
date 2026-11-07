export class NotPlainError extends Error {
  override readonly name = 'NotPlainError'

  constructor(readonly path: string) {
    super(
      `The value at "${path}" can't cross a thread: only plain objects, arrays, primitives, typed arrays and ArrayBuffers can.`,
    )
  }
}
