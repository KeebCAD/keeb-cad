export class MissingInjectorProviderError extends Error {
  constructor() {
    super('useService / useInjector requires a provideInjector ancestor in the Vue tree.')
    this.name = 'MissingInjectorProviderError'
  }
}
