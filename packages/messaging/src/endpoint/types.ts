// What a Worker, a MessagePort and a worker's own scope have in common.
export interface Endpoint {
  postMessage(message: unknown, options?: StructuredSerializeOptions): void
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void
  removeEventListener(type: 'message', listener: (event: MessageEvent) => void): void
  start?(): void
}
