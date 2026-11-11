import { InvariantError } from '@keeb-cad/result'
import type { Rejection } from '@keeb-cad/schema'
import { match, P } from 'ts-pattern'

export function rejectionText(rejection: Rejection): string {
  return match(rejection)
    .with({ kind: 'unavailable' }, () => 'Not available right now.')
    .with({ kind: 'unknown-command' }, () => 'No such command.')
    .with({ kind: 'stale' }, () => 'The design changed; try again.')
    .with({ kind: 'input-invalid' }, ({ command, issues }) => {
      const [first] = issues
      // Every input-invalid is built from a failed parse, which never fails with no issue.
      if (first === undefined) {
        throw new InvariantError(`The input-invalid rejection of "${command}" has no issue.`)
      }
      return first.message
    })
    .with({ message: P.string }, ({ message }) => message)
    .exhaustive()
}
