import { describe, expectTypeOf, it } from 'vitest'

import type { ModelRejectionKind, Rejection } from './results'

// The register's own kinds, read off the union so the list can't drift.
type RegisterKind = Extract<Rejection, { command: string } | { seq: number }>['kind']

// Type-only tests: `pnpm typecheck` checks them, so they hold no runtime assertion.
/* eslint-disable vitest/expect-expect */
describe('Rejection', () => {
  it('has the register kinds the spine names', () => {
    expectTypeOf<RegisterKind>().toEqualTypeOf<'input-invalid' | 'unavailable' | 'stale'>()
  })

  it('never lets a model kind reuse a register kind name', () => {
    // A reused name would leave editor's exhaustive match compiling while it shows the wrong text.
    expectTypeOf<Extract<ModelRejectionKind, RegisterKind>>().toBeNever()
  })
})
