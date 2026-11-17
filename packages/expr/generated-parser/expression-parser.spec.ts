import { readFileSync } from 'node:fs'

import peggy from 'peggy'
import { expect, it } from 'vitest'

const GRAMMAR_SOURCE = 'src/expression-parser.peggy'

it('commits the parser the grammar generates', () => {
  const grammar = readFileSync(new URL('../src/expression-parser.peggy', import.meta.url), 'utf8')
  const committed = readFileSync(new URL('../src/expression-parser.js', import.meta.url), 'utf8')
  const generated = peggy.generate(grammar, {
    output: 'source',
    format: 'es',
    grammarSource: GRAMMAR_SOURCE,
  })
  expect(generated).toBe(committed)
})
