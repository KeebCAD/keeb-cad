import type { Command, Writable } from '@keeb-cad/design'
import { checkSetArrangement, setArrangement } from '@keeb-cad/model/main'
import type { Result } from '@keeb-cad/result'
import type { Design, Frozen, Rejection } from '@keeb-cad/schema'

import { setArrangementInputSchema } from './set-arrangement-input-schema'
import type { SetArrangementInput } from './types'

export class SetArrangement implements Command<SetArrangementInput> {
  static readonly kind = 'command'
  static readonly id = 'layout.setArrangement'
  static readonly label = 'Set arrangement'
  static readonly input = setArrangementInputSchema

  available(
    design: Frozen<Design>,
    { ids, ...edit }: SetArrangementInput,
  ): Result<void, Rejection> {
    return checkSetArrangement(design, ids, edit)
  }

  apply(draft: Writable<Design>, { ids, ...edit }: SetArrangementInput): void | Rejection {
    return checkSetArrangement(draft, ids, edit).match<void | Rejection>({
      ok: () => {
        setArrangement(draft, ids, edit)
      },
      err: (rejection) => rejection,
    })
  }
}
