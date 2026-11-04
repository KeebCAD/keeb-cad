export class NoInjectionContextError extends Error {
  readonly callsite: string | undefined

  constructor(callsite?: string) {
    super(
      callsite
        ? `${callsite} called outside any active resolution context.`
        : 'inject() called outside any active resolution context.',
    )
    this.name = 'NoInjectionContextError'
    this.callsite = callsite
  }
}
