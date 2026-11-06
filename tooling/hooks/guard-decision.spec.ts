import { describe, expect, it } from 'vitest'

import { guardDecision } from './guard-decision'

const bash = (command: string) => guardDecision({ tool_name: 'Bash', tool_input: { command } })
const edit = (file_path: string, new_string = '') =>
  guardDecision({ tool_name: 'Edit', tool_input: { file_path, new_string } })

const PLAN = '_bmad-output/x/tickets/story-a-plan.md'
const READY = "status: 'ready-for-dev'"
const REVIEWED_PLAN =
  "---\nstatus: 'draft'\n---\n\n## Conformance Log\n\nChecked 40 rules, no findings.\n"
const planEdit = (new_string: string, currentText = '') =>
  guardDecision({ tool_name: 'Edit', tool_input: { file_path: PLAN, new_string } }, currentText)

describe('the guard hook', () => {
  it.each([
    ['a Vitest snapshot update', 'pnpm vitest run -u'],
    ['a long-form snapshot update through pnpm test', 'pnpm test --update'],
    ['a screenshot baseline update', 'pnpm exec playwright test --update-snapshots'],
    ['a baseline update through the smoke script', 'pnpm smoke --update-snapshots'],
    ['a hooks bypass', 'git commit --no-verify -m x'],
    ['a force push', 'git push --force origin x'],
    ['a short-flag force push', 'git push -f origin x'],
    ['a force-with-lease push', 'git push --force-with-lease origin x'],
    ['a force push after another command', 'pnpm test && git push origin x -f'],
    ['a force push in combined short flags', 'git push -fu origin x'],
    ['a force push after a git option', 'git -C dir push -f'],
    ['deleting a spec', 'rm packages/x/src/a.spec.ts'],
    ['deleting a test through git', 'git rm app/e2e/vue.test.ts'],
    ['a break threshold on the command line', 'pnpm stryker run --break 50'],
    ['thresholds on the mutation script', 'pnpm test:mutation --thresholds.break 10'],
    ['another config file for stryker run', 'pnpm exec stryker run lax.json'],
    ['another config file for the mutation script', 'pnpm test:mutation lax.json'],
  ])('denies %s', (_, command) => {
    expect(bash(command)).toMatchObject({ permissionDecision: 'deny' })
  })

  it('names snapshots in the reason it denies a snapshot update', () => {
    expect(bash('pnpm vitest run -u')).toMatchObject({
      permissionDecisionReason: expect.stringContaining('snapshots'),
    })
  })

  it.each([
    ['a plain push', 'git push origin x'],
    ['deleting a source file', 'rm packages/x/src/a.ts'],
    ['the whole suite', 'pnpm test'],
    ['a scoped Vitest run', 'pnpm vitest run --project tooling'],
    ['a mutation run', 'pnpm test:mutation'],
    ['a git flag that starts with u', 'git status -uall'],
    ['a scoped mutation run', 'pnpm exec stryker run --mutate packages/pcb/src/a.ts'],
    [
      'a heredoc that writes a denied command as text',
      "cat > notes.md <<'EOF'\npnpm vitest run -u\nEOF",
    ],
  ])('allows %s', (_, command) => {
    expect(bash(command)).toBeUndefined()
  })

  it.each([
    ['a Vitest snapshot', 'packages/x/src/__snapshots__/a.spec.ts.snap'],
    ['a snap file outside __snapshots__', 'src/a.snap'],
    ['a screenshot baseline', 'app/e2e/a.spec.ts-snapshots/x.png'],
    ['a browser-mode screenshot baseline', 'packages/editor/src/__screenshots__/a.spec.ts/x.png'],
  ])('denies an edit to %s', (_, path) => {
    expect(edit(path)).toMatchObject({ permissionDecision: 'deny' })
  })

  it('denies writing a baseline with Write', () => {
    expect(
      guardDecision({
        tool_name: 'Write',
        tool_input: { file_path: '/repo/app/e2e/a.spec.ts-snapshots/x.png', content: '' },
      }),
    ).toMatchObject({ permissionDecision: 'deny' })
  })

  it.each([
    ['the editor’s Vitest config', 'packages/editor/vitest.config.ts'],
    ['the root Vitest config', '/repo/vitest.config.ts'],
    ['a Vite config', 'app/vite.config.ts'],
    ['the Playwright config', 'app/playwright.config.ts'],
    ['the mutation run’s Vitest config', 'vitest.mutation.config.ts'],
    ['the Stryker config', 'stryker.config.json'],
    ['a module Stryker config', 'stryker.config.mjs'],
    ['another Stryker config file', 'stryker-lax.json'],
    ['the lint config', 'eslint.config.ts'],
    ['the import rules', '/repo/.dependency-cruiser.mts'],
    ['a named lint config', 'eslint.e2e.config.ts'],
    ['a JSON import rules file', '.dependency-cruiser.json'],
  ])('asks before an edit to %s', (_, path) => {
    expect(edit(path)).toMatchObject({ permissionDecision: 'ask' })
  })

  it.each([
    ['a disable comment', '// Stryker disable next-line all'],
    ['a restore comment', '// Stryker restore all'],
  ])('asks before an edit adding %s', (_, text) => {
    expect(edit('packages/pcb/src/a.ts', text)).toMatchObject({ permissionDecision: 'ask' })
  })

  it('asks before a MultiEdit whose later edit adds a disable comment', () => {
    expect(
      guardDecision({
        tool_name: 'MultiEdit',
        tool_input: {
          file_path: 'packages/pcb/src/a.ts',
          edits: [
            { new_string: 'const a = 1' },
            { new_string: '// Stryker disable next-line all' },
          ],
        },
      }),
    ).toMatchObject({ permissionDecision: 'ask' })
  })

  it.each([
    ['a spec', 'packages/x/src/a.spec.ts'],
    ['a file whose name holds config', 'packages/x/src/vitest-config.ts'],
    ['a file whose name holds the lint config', 'packages/x/src/eslint-config.ts'],
    ['a lint rule spec', 'tooling/lint/no-inline-config.spec.ts'],
    ['a ticket', '_bmad-output/x.md'],
  ])('allows an edit to %s', (_, path) => {
    expect(edit(path, 'const a = 1')).toBeUndefined()
  })

  it('denies approving a plan that has no conformance log', () => {
    expect(planEdit(READY, "---\nstatus: 'draft'\n---\n")).toMatchObject({
      permissionDecision: 'deny',
      permissionDecisionReason: expect.stringContaining('Conformance Log'),
    })
  })

  it('denies approving a new plan written without a conformance log', () => {
    expect(
      guardDecision({
        tool_name: 'Write',
        tool_input: { file_path: PLAN, content: `---\n${READY}\n---\n` },
      }),
    ).toMatchObject({ permissionDecision: 'deny' })
  })

  it.each([
    ['a plan whose conformance log is already written', () => planEdit(READY, REVIEWED_PLAN)],
    [
      'a plan written with its conformance log',
      () =>
        guardDecision({
          tool_name: 'Write',
          tool_input: { file_path: PLAN, content: `---\n${READY}\n---\n\n## Conformance Log\n` },
        }),
    ],
    ['another status on a plan', () => planEdit("status: 'in-progress'")],
    ['a plan line that names the status in prose', () => planEdit('leave it `ready-for-dev`')],
    [
      'the status on a story that is not a plan',
      () => edit('_bmad-output/x/tickets/story-a.md', READY),
    ],
  ])('allows approving %s', (_, decide) => {
    expect(decide()).toBeUndefined()
  })

  it('denies a shell edit that approves a plan', () => {
    expect(bash(`sed -i "s/status: 'draft'/${READY}/" ${PLAN}`)).toMatchObject({
      permissionDecision: 'deny',
    })
  })

  it('allows reading a plan’s status from the shell', () => {
    expect(bash(`grep ready-for-dev ${PLAN}`)).toBeUndefined()
  })

  it('allows a tool it does not guard', () => {
    expect(
      guardDecision({ tool_name: 'Read', tool_input: { file_path: 'a.snap' } }),
    ).toBeUndefined()
  })

  it('allows empty input', () => {
    expect(guardDecision({})).toBeUndefined()
  })
})
