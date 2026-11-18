// The focus session of the one field that holds focus: every command it runs carries this key, so
// the design store coalesces them into one undo entry.
export class FieldSession {
  get key(): string | undefined {
    return this.#key
  }

  // A fresh key each time, since the store joins any run whose key matches its open session's.
  begin(): void {
    this.#key = crypto.randomUUID()
  }

  end(): void {
    this.#key = undefined
  }

  #key: string | undefined = undefined
}
