import type { Command, Writable } from '@keeb-cad/design'
import { checkSetGap, setGap } from '@keeb-cad/model/main'
import type { Result } from '@keeb-cad/result'
import type { Design, Frozen, Rejection } from '@keeb-cad/schema'

import { setGapInputSchema } from './set-gap-input-schema'
import type { SetGapInput } from './types'

export class SetGap implements Command<SetGapInput> {
  static readonly kind = 'command'
  static readonly id = 'layout.setGap'
  static readonly label = 'Set gap'
  static readonly input = setGapInputSchema

  available(design: Frozen<Design>, edit: SetGapInput): Result<void, Rejection> {
    return checkSetGap(design, edit)
  }

  apply(draft: Writable<Design>, edit: SetGapInput): void | Rejection {
    return checkSetGap(draft, edit).match<void | Rejection>({
      ok: () => {
        setGap(draft, edit)
      },
      err: (rejection) => rejection,
    })
  }
}
