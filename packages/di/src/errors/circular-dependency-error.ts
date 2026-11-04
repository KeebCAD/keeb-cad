export class CircularDependencyError extends Error {
  readonly chain: readonly string[]

  constructor(chain: readonly string[]) {
    super(`Circular dependency detected: ${chain.join(' -> ')}`)
    this.name = 'CircularDependencyError'
    this.chain = chain
  }
}
