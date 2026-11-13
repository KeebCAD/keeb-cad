import type { ItemId } from '@keeb-cad/schema'
import { match } from 'ts-pattern'

import { unresolvableReferenceMessage } from '../violations/unresolvable-reference-message'
import type { PartViolationDetail } from './types'

export function partViolationMessage(detail: PartViolationDetail, ids: readonly ItemId[]): string {
  const [named] = ids
  return match(detail)
    .with({ kind: 'unresolvable-reference' }, () => unresolvableReferenceMessage('part', ids))
    .with(
      { kind: 'blueprint-api-too-new' },
      ({ blueprint }) => `The part "${String(named)}" needs a newer app: ${blueprint}.`,
    )
    .with(
      { kind: 'lane-failed' },
      (failed) => `The part "${String(named)}" failed: ${causeOf(failed)}.`,
    )
    .exhaustive()
}

function causeOf(failed: Extract<PartViolationDetail, { kind: 'lane-failed' }>): string {
  return match(failed)
    .with({ cause: 'threw' }, ({ message }) => message)
    .with({ cause: 'step-budget' }, () => 'it ran past its step budget')
    .with({ cause: 'out-of-memory' }, () => 'it ran out of memory')
    .with({ cause: 'not-json-exact' }, ({ path }) => `not a JSON-exact value at ${path}`)
    .with({ cause: 'pending-job' }, () => 'it left a pending job')
    .with({ cause: 'role' }, ({ output }) => `the output "${output}" is not what it declares`)
    .with(
      { cause: 'nested-input' },
      ({ blueprint, input }) => `the nested input "${input}" of ${blueprint}`,
    )
    .with({ cause: 'boundary' }, ({ message }) => message)
    .exhaustive()
}
