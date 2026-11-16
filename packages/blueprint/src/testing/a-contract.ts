import { aBlueprintDeclaration, aLaneDeclaration } from '@keeb-cad/schema/testing'

import type { BlueprintContract } from '../pool/types'

// The lane is `parts`, lane-script's STAGE; importing it would make the two files a cycle.
export function aContract(overrides: Partial<BlueprintContract> = {}): BlueprintContract {
  return {
    ...aBlueprintDeclaration({
      lanes: {
        parts: aLaneDeclaration({
          outputs: [{ name: 'value', role: 'value', kind: 'config', count: 'one' }],
        }),
      },
    }),
    ...overrides,
  }
}
