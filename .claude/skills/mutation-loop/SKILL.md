---
name: mutation-loop
description: Run Stryker on changed pure logic in a priority package (pcb, plates, case, exports, design-file, storage) and give every surviving mutant a verdict — test gap, implementation boundary, or equivalent proposed for a person. Use after changing those packages' pure logic or their tests, or when asked to "run mutation testing", "kill the survivors" or "why does the mutation gate fail".
---

<!--
Adapted from the ninja-testing plugin's skills/mutation-loop.
MIT License, Copyright (c) 2026 Illya Klymov.
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
associated documentation files (the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge, publish, distribute,
sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions: The above copyright notice and this
permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT
OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
-->

# Mutation loop

Coverage proves a line ran, not that a test checked it. Stryker changes the code (`<` to `<=`, a
condition to `true`) and reruns the tests; a mutant every test survives is behaviour nothing pins.
In `pcb`, `plates`, `case`, `exports`, `design-file` and `storage` that is a fab order, a print or
a user's work. Run the tool; never reason about which mutants would survive.

## Scope

- `stryker.config.json` mutates every `.ts` file under those packages' `src/`, minus specs,
  `types.ts` and `index.ts`, and runs the Node Vitest projects (`vitest.mutation.config.ts`).
- A file that needs a browser or I/O is not mutated: the story that adds it puts
  `!packages/<p>/src/<file>.ts` in the config's `mutate` list. Its tests are proven by a toggled
  bug instead: break the code, watch the test go red, restore it, and say so in the PR.
- The gate is `thresholds.break` 90; CI's `mutation` job fails below it. Never 100: chasing it
  produces tests that pin equivalent mutants and implementation details.

## Procedure

1. **Baseline.** `pnpm test` green. Have the requirement in hand: the ticket, the plan's boundary
   table. Without it you cannot tell a test gap from a boundary the implementation invented.
2. **Run scoped to the changed files.** `pnpm exec stryker run --mutate packages/<p>/src/<file>.ts`
   (comma-separate several). `pnpm test:mutation` runs the whole scope, as CI does. A pure file
   takes seconds; minutes means the tests are not unit tests.
3. **Read the report.** `reports/mutation/mutation.json` (and `mutation.html`). For each
   `Survived` or `NoCoverage` mutant note the file, line, mutator, original and replacement.
   Survivors in files you did not change are not yours; say so and leave them. `NoCoverage` on
   logic is a missing test.
4. **Give every survivor one of three verdicts.**
   - **Test gap**: the boundary is in the requirement and no test sits on it. Add the boundary
     rows (just below, on, just above), named for the boundary's role, numbers in `expected*`
     constants or parameters. A threshold, date or default that the requirement states is always
     a test gap, never an exclusion.
   - **Implementation boundary**: a limit, rounding, default or ordering the code introduced and
     no requirement mentions. Do not write a test that blesses it. List it under your decisions;
     a person decides and records it, then it becomes a row.
   - **Equivalent**: no input can make the outputs differ. Prove it: evaluate the function's
     result (not the branch) with the original and the mutant at the boundary `b`, `b − 1` and
     `b + 1` (or `± ε`). Any pair differs: it is a test gap, and that input is the new row. All
     equal: propose a point-wise exclusion with the arithmetic as its reason,
     `// Stryker disable next-line EqualityOperator: <why the outputs cannot differ>`. A person
     confirms it; the guard hook asks before any edit adding `Stryker disable`. In a run where
     nobody can answer, put the proposed comment in your report instead.
5. **Check each new assertion for leakage.** It must assert a returned value or a visible effect,
   never a call (`toHaveBeenCalled*` only when the call is the behaviour). If it can only be
   understood by knowing which mutant it kills, it pins the implementation: delete it, and the
   honest verdict was probably "equivalent".
6. **Tests that kill nothing.** A test in the changed spec whose id appears in no mutant's
   `killedBy` verifies nothing Stryker could find. Read it: what does it claim? Rewrite or delete
   it; do not keep it for coverage.
7. **Rerun and repeat** until every survivor has a verdict. Then run `pnpm test`, and end with the
   decisions you made on your own.

## Never

- Lower `thresholds`, add a mutator to `excludedMutations`, narrow `mutate` to drop a file, pass
  another config file or threshold flags on the command line (the guard denies both), or edit any
  runner config to make the score pass.
- Kill a survivor with `toHaveBeenCalledWith` on an internal call.
- Compute expected values by running the code, or from an earlier report.

## Done when

- Every survivor in the changed files has a verdict: a new boundary test, a listed decision, or a
  proposed point-wise exclusion with its proof.
- No config threshold, mutator or `mutate` entry changed to reach the gate.
- `pnpm test` is green and the report names every decision you made on your own.
