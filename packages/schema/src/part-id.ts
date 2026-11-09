import * as v from 'valibot'

const PREFIX = 'lib:part/'

export const partIdSchema = v.pipe(
  v.string(),
  v.custom<`lib:part/${string}`>(
    (input) =>
      typeof input === 'string' && input.startsWith(PREFIX) && input.length > PREFIX.length,
    'Not a part id.',
  ),
  v.brand('PartId'),
)
