import { describeValue } from './describe-value'

export class InvalidTokenError extends Error {
  readonly received: unknown

  constructor(received: unknown) {
    super(
      `Expected a Token, MultiToken, or class constructor; received ${describeValue(received)}.`,
    )
    this.name = 'InvalidTokenError'
    this.received = received
  }
}
