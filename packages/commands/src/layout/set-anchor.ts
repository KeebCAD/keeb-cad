import type { Command, Writable } from '@keeb-cad/design'
import { checkSetAnchor, setAnchor } from '@keeb-cad/model/main'
import type { Result } from '@keeb-cad/result'
import type { Design, Frozen, Rejection } from '@keeb-cad/schema'

import { setAnchorInputSchema } from './set-anchor-input-schema'
import type { SetAnchorInput } from './types'

export class SetAnchor implements Command<SetAnchorInput> {
  static readonly kind = 'command'
  static readonly id = 'layout.setAnchor'
  static readonly label = 'Set anchor'
  static readonly input = setAnchorInputSchema

  available(design: Frozen<Design>, { id, anchor }: SetAnchorInput): Result<void, Rejection> {
    return checkSetAnchor(design, id, anchor)
  }

  apply(draft: Writable<Design>, { id, anchor }: SetAnchorInput): void | Rejection {
    return setAnchor(draft, id, anchor)
  }
}
