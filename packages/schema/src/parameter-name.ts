import * as v from 'valibot'

const UNIT_WORDS: ReadonlySet<string> = new Set(['mm', 'deg'])

export const parameterNameSchema = v.pipe(
  v.string(),
  v.regex(/^\p{L}[\p{L}0-9_]*$/u, 'A parameter name is a letter, then letters, digits or _.'),
  v.check((name) => !UNIT_WORDS.has(name), 'mm and deg are units, not parameter names.'),
  v.brand('ParameterName'),
)
