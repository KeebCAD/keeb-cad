// The scorecard's run status from the worker's response. Pure, no side effects at import.
import type { RouteResponse } from '../src/protocol'
import type { RunStatus } from '../src/route-set'

/** failed + thrown → threw; failed → failed; timeout; solved; probed (a control, not a run) → failed. */
export function runStatus(response: Pick<RouteResponse, 'status'> & { thrown?: boolean }): RunStatus {
  switch (response.status) {
    case 'failed':
      return response.thrown ? 'threw' : 'failed'
    case 'probed':
      return 'failed'
    case 'timeout':
    case 'solved':
      return response.status
  }
}
