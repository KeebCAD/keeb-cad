// A dev-server-only script that builds the design launch opens (spine glossary `dev seed`).
export type DevSeed = {
  // Whether the page's URL asks for this seed.
  requested(): boolean
  // Opens the seed's design, as a new design.
  open(): Promise<void>
}
