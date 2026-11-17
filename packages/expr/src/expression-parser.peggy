// The expression grammar. `pnpm --filter @keeb-cad/expr generate:parser` writes
// expression-parser.js from this file; never edit that file by hand.

Expression
  = Blank
  / _ @Sum _

// An input with no token fails at its start, not at its end, wherever its whitespace stops.
Blank
  = [ \t]* !. {
      const { source, start } = location()
      error('Expected a number or a name', { source, start, end: start })
    }

Sum
  = head:Product tail:(_ op:[+-] _ right:Product { return { op, right, end: location().end.offset } })* {
      const start = location().start.offset
      return tail.reduce((left, { op, right, end }) => ({ type: 'binary', op, left, right, start, end }), head)
    }

Product
  = head:Unary tail:(_ op:[*/] _ right:Unary { return { op, right, end: location().end.offset } })* {
      const start = location().start.offset
      return tail.reduce((left, { op, right, end }) => ({ type: 'binary', op, left, right, start, end }), head)
    }

Unary
  = "-" _ operand:Unary {
      const { start, end } = location()
      return { type: 'negate', operand, start: start.offset, end: end.offset }
    }
  / Primary

Primary
  = NumberLiteral
  / Name
  / "(" _ @Sum _ ")"

NumberLiteral
  = digits:$([0-9]+ ("." [0-9]+)?) unit:(@("mm" / "deg") ![\p{L}0-9_]u)? {
      const value = Number(digits)
      // No number literal in a tree is non-finite, so the evaluator needs no check on a literal.
      if (!Number.isFinite(value)) error('Expected a number a double can hold')
      const { start, end } = location()
      return unit === null
        ? { type: 'number', value, start: start.offset, end: end.offset }
        : { type: 'number', value, unit, start: start.offset, end: end.offset }
    }

Name
  = name:$([\p{L}]u [\p{L}0-9_]u*) {
      const { start, end } = location()
      return { type: 'name', name, start: start.offset, end: end.offset }
    }

_
  = [ \t]*
