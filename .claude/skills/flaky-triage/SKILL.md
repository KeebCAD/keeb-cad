---
name: flaky-triage
description: Diagnose an unstable test instead of making it green. Use when a test passed on retry, fails only in CI, only in parallel or only in some order, when asked to "fix the flaky test", "raise the timeout" or "add a retry", or when a shuffled run fails with a seed.
---

<!--
Adapted from the ninja-testing plugin's skills/flaky-triage.
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

# Flaky triage

The cheapest way to green is to raise a timeout, delete an intermediate check or retry until it
passes. Each hides the source, and a red run stops meaning anything. Name the source instead.

A test that fails on every run is not flaky: it is a regression or a wrong test; fix the code or
the test. This skill is for a test that sometimes fails on the same code.

## Inputs

- The log of the failing run: what the assertion expected, what it saw, where in the test.
- The seed. Every Vitest project runs in random order (`sequence.shuffle`); `pnpm test` prints
  `Running tests with seed "<n>"`, and `pnpm test --sequence.seed=<n>` replays every project's
  order.
- The commit SHA and, for CI, the job.

No log: ask for it before touching anything. No seed: rerun once and record the printed seed.

## Procedure

1. **Read the log before anything else.** Write down what the assertion expected, what it saw,
   and at what step. No rerun before that line exists.
2. **Non-deterministic or flaky?** A clock read, `Math.random`, locale or time-zone output, or
   unordered iteration in the test or the code under test is non-determinism: the test failed to
   fix its environment. Fix it inside the test (Vitest's fake timers, a fixed input, a fixed
   locale; never a clock registered only so tests can control it), report, and stop. Otherwise the
   test blinks on a live system: continue.
3. **A unit or integration test: reproduce by seed, not by retry.**
   1. Rerun with the failing seed: `pnpm test --sequence.seed=<n>` (narrow with `--project` once
      it reproduces). It must fail before you change anything.
   2. Rerun with `--no-file-parallelism`. Green in sequence and red in parallel: files share a
      resource. Red only after another test in the same file: tests in the file share state.
   3. Name the shared resource. Tests leak into each other through mutable state at module level
      or in a describe callback (which the lint rules forbid, so look in helpers and fixtures), a
      `globalThis` or `window` write left behind, a module-level singleton instead of a `di`
      service, or a shared file, port or browser cache.
   4. Isolate it where it is used: state is created inside the test, substitutes are registered in
      the test's own `di` container, a reset lives in the dependent file's `beforeEach`. Never a
      `globalSetup` or other runner-config change.
   5. Rerun with the failing seed (green now) and three other seeds, then `pnpm test`.
4. **An end-to-end test: name the source before touching the test.** Check in this order and
   write down which one the log confirms:
   1. it waits for time, not state (`waitForTimeout`, a sleep before an assertion): wait for a
      state instead, a visible element, a URL, a network response;
   2. state left over from an earlier run: start from a known state, assert on what the test
      created rather than on totals;
   3. a brittle selector (CSS class, `nth-child`, layout): find by role, then label, then text;
   4. a race between the runner polling the page and the page changing: a faster app that fails
      a test is a race, not a regression. Wait on a state that cannot be skipped and keep the
      assertion that the action happened.
5. **Refuse the four "fixes", and say why in the report:**
   1. raising a timeout without naming the source it covers; a timeout change carries its cause
      next to it;
   2. removing an intermediate check, which stops the test proving the action happened;
   3. slowing or holding the backend so the test can see a state, when the test must see what a
      user sees;
   4. retrying without reading the log.
6. **Hand timing analysis to a person.** Reasoning about two asynchronous processes racing is where
   an agent is weakest. Give the log excerpt, the sources you confirmed and ruled out, and the
   reproduction command (seed included); the person decides the fix for a race.

## Never

Skip, delete or weaken the test; raise a timeout without its cause; edit the Vitest, Playwright or
Stryker config to get green; add a retry. If no source is confirmed, say so and report: do not
leave the test quieter than you found it.

## Done when

- The report names the source: the non-deterministic input, the shared resource, or the end-to-end
  source (1 to 4); or states that none was confirmed, with the evidence, for a person to decide.
- A unit or integration fix reproduced red with the failing seed before and green after, with three
  more seeds and `pnpm test` green, and no runner config changed.
- An end-to-end fix added no sleep, removed no intermediate check, slowed no backend, and raised no
  timeout without the cause written beside it.
