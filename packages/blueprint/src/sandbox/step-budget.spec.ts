import { describe, expect, it } from 'vitest'

import { StepBudget } from './step-budget'

const after = (ticks: number) => {
  const budget = new StepBudget()
  Array.from({ length: ticks }, () => budget.tick())
  return budget
}

describe('StepBudget', () => {
  it.each([
    ['just below the budget', 99, false],
    ['on the budget', 100, false],
    ['just above the budget', 101, true],
  ])('%s', (_role, ticks, expected) => {
    expect(after(ticks).exhausted).toBe(expected)
  })

  it('counts afresh after a reset', () => {
    const budget = after(101)
    budget.reset()
    expect(budget.exhausted).toBe(false)
  })
})
