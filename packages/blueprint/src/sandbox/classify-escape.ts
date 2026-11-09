import { match } from 'ts-pattern'

import type { StepBudget } from './step-budget'
import type { ClassifiedEscape, EscapedFromEngine } from './types'

export function classifyEscape(
  escape: EscapedFromEngine,
  budget: Pick<StepBudget, 'exhausted'>,
): ClassifiedEscape {
  return match(escape)
    .with({ kind: 'raw-exception' }, () => ({
      failure: budget.exhausted
        ? { kind: 'lane-failed' as const, cause: 'step-budget' as const }
        : { kind: 'lane-failed' as const, cause: 'out-of-memory' as const },
      vmDead: false,
    }))
    .with({ kind: 'thrown' }, () => ({
      failure: {
        kind: 'lane-failed' as const,
        cause: 'boundary' as const,
        message: 'the engine trapped',
      },
      vmDead: true,
    }))
    .exhaustive()
}
