export interface Stamp {
  epoch: number
  seq: number
}

export type Stamped = { kind: string } & Stamp

export type Handlers<M extends Stamped> = {
  [K in M['kind']]: (message: Extract<M, { kind: K }>) => void
}

export interface DispatcherOptions {
  designKinds: readonly string[]
  // The kind carrying the whole value, the first message a new receiver is sent.
  wholeKind: string
}
