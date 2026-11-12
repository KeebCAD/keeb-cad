import { InvariantError } from '@keeb-cad/result'
import type { Rejection, SchemaIssue } from '@keeb-cad/schema'
import { match, P } from 'ts-pattern'

import type { ActionFailure } from './types'

export function rejectionText(rejection: Rejection | ActionFailure): string {
  return match(rejection)
    .with({ kind: 'unavailable' }, () => 'Not available right now.')
    .with({ kind: 'unknown-command' }, () => 'No such command.')
    .with({ kind: 'stale' }, () => 'The design changed; try again.')
    .with({ kind: 'input-invalid' }, ({ command, issues }) =>
      firstIssueMessage(issues, `The input-invalid rejection of "${command}"`),
    )
    .with({ kind: 'design-invalid' }, ({ issues }) =>
      firstIssueMessage(issues, 'The design-invalid failure'),
    )
    .with({ kind: 'format-too-new' }, () => 'This design was saved by a newer keeb-cad.')
    .with({ kind: 'not-found' }, ({ id }) => `No stored design has the id ${id}.`)
    .with(
      { kind: 'quota-exceeded' },
      () => "The browser's storage is full; free some space and try again.",
    )
    .with({ message: P.string }, ({ message }) => message)
    .exhaustive()
}

// Both kinds are built from a failed parse, which never fails with no issue.
function firstIssueMessage(issues: readonly SchemaIssue[], what: string): string {
  const [first] = issues
  if (first === undefined) throw new InvariantError(`${what} has no issue.`)
  return first.message
}
