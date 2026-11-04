export class ContainerDisposedError extends Error {
  constructor() {
    super('Operation attempted on a disposed container or scope.')
    this.name = 'ContainerDisposedError'
  }
}
