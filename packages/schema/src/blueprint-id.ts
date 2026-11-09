import * as v from 'valibot'

const PREFIX = 'lib:blueprint/'

export const blueprintIdSchema = v.pipe(
  v.custom<`lib:blueprint/${string}`>(
    (input) =>
      typeof input === 'string' && input.startsWith(PREFIX) && input.length > PREFIX.length,
    'Not a blueprint id.',
  ),
  v.brand('BlueprintId'),
)
