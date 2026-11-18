import type { Command, Writable } from '@keeb-cad/design'
import { checkSetOffset, setOffset } from '@keeb-cad/model/main'
import type { Result } from '@keeb-cad/result'
import type { Design, Frozen, Rejection } from '@keeb-cad/schema'

import { setOffsetInputSchema } from './set-offset-input-schema'
import type { SetOffsetInput } from './types'

export class SetOffset implements Command<SetOffsetInput> {
  static readonly kind = 'command'
  static readonly id = 'layout.setOffset'
  static readonly label = 'Set offset'
  static readonly input = setOffsetInputSchema

  available(design: Frozen<Design>, { ids, ...edit }: SetOffsetInput): Result<void, Rejection> {
    return checkSetOffset(design, ids, edit)
  }

  apply(draft: Writable<Design>, { ids, ...edit }: SetOffsetInput): void | Rejection {
    return checkSetOffset(draft, ids, edit).match<void | Rejection>({
      ok: () => {
        setOffset(draft, ids, edit)
      },
      err: (rejection) => rejection,
    })
  }
}
