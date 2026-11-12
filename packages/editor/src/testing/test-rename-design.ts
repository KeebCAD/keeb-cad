import type { Command, Writable } from '@keeb-cad/design'
import { Result } from '@keeb-cad/result'
import type { Design, Frozen, Rejection } from '@keeb-cad/schema'

import { testRenameDesignInputSchema } from './test-rename-design-input-schema'
import type { TestRenameDesignInput } from './types'

export class TestRenameDesign implements Command<TestRenameDesignInput> {
  static readonly kind = 'command'
  static readonly id = 'testing.renameDesign'
  static readonly label = 'Rename design'
  static readonly input = testRenameDesignInputSchema

  available(design: Frozen<Design>, input: TestRenameDesignInput): Result<void, Rejection> {
    return input.name === design.meta.name
      ? Result.err({
          kind: 'id-taken',
          ids: [design.meta.id],
          message: 'That is already its name.',
        })
      : Result.ok()
  }

  apply(draft: Writable<Design>, input: TestRenameDesignInput): void {
    draft.meta.name = input.name
  }
}
