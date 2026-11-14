import type { Command, Writable } from '@keeb-cad/design'
import { checkSetOverride, setOverride } from '@keeb-cad/model/main'
import type { Result } from '@keeb-cad/result'
import type { Design, Frozen, Rejection } from '@keeb-cad/schema'

import { setOverrideInputSchema } from './set-override-input-schema'
import type { SetOverrideInput } from './types'

export class SetOverride implements Command<SetOverrideInput> {
  static readonly kind = 'command'
  static readonly id = 'overrides.setOverride'
  static readonly label = 'Set override'
  static readonly input = setOverrideInputSchema

  available(design: Frozen<Design>, override: SetOverrideInput): Result<void, Rejection> {
    return checkSetOverride(design, override)
  }

  apply(draft: Writable<Design>, override: SetOverrideInput): void | Rejection {
    return setOverride(draft, override)
  }
}
