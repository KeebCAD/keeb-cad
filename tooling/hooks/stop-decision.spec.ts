import { describe, expect, it } from 'vitest'

import { stopDecision } from './stop-decision'
import type { TranscriptEntry } from './types'

const PROJECT = '/repo'

const toolUse = (name: string, input: Record<string, string>): TranscriptEntry => ({
  type: 'assistant',
  message: { content: [{ type: 'tool_use', name, input }] },
})
const edited = (file_path: string) => toolUse('Edit', { file_path })
const ran = (command: string) => toolUse('Bash', { command })
const ranAt = (command: string, timestamp: string): TranscriptEntry => ({
  ...ran(command),
  timestamp,
})

const RUN_AT = '2026-11-05T10:00:00.000Z'
const BEFORE_RUN = Date.parse('2026-11-05T09:59:59.000Z')
const AFTER_RUN = Date.parse('2026-11-05T10:00:01.000Z')

const expectedBlock = { decision: 'block', reason: expect.stringContaining('`pnpm test`') }

describe('the stop hook', () => {
  it('blocks when a spec changed and no full run followed', () => {
    expect(stopDecision([edited('/repo/packages/x/src/a.spec.ts')], PROJECT, false, [])).toEqual(
      expectedBlock,
    )
  })

  it('passes the second stop of the same prompt', () => {
    expect(
      stopDecision([edited('/repo/packages/x/src/a.spec.ts')], PROJECT, true, []),
    ).toBeUndefined()
  })

  it.each([
    ['a package source', '/repo/packages/x/src/a.ts'],
    ['an app component', '/repo/app/src/App.vue'],
    ['a fixture module', '/repo/fixtures/src/a.ts'],
    ['a tooling script', '/repo/tooling/hooks/guard.ts'],
    ['a path given relative to the project', 'packages/x/src/a.ts'],
  ])('blocks when %s changed', (_, path) => {
    expect(stopDecision([edited(path)], PROJECT, false, [])).toEqual(expectedBlock)
  })

  it('names the changed file in the reason', () => {
    expect(stopDecision([edited('/repo/packages/x/src/a.ts')], PROJECT, false, [])).toMatchObject({
      reason: expect.stringContaining('packages/x/src/a.ts'),
    })
  })

  it.each([
    ['only docs', '/repo/_bmad-output/x.md'],
    ['a markdown file in a package', '/repo/packages/x/README.md'],
    ['a root config', '/repo/vitest.config.ts'],
    ['a file outside the project', '/elsewhere/packages/x/src/a.ts'],
  ])('passes when %s changed', (_, path) => {
    expect(stopDecision([edited(path)], PROJECT, false, [])).toBeUndefined()
  })

  it.each([
    ['pnpm test', 'pnpm test'],
    ['pnpm check', 'pnpm check'],
    ['pnpm test through mise', 'mise exec -- pnpm test'],
    ['pnpm test piped to tail', 'pnpm test 2>&1 | tail -20'],
    ['pnpm test after another command', 'pnpm lint && pnpm test'],
  ])('passes when %s ran after the change', (_, command) => {
    expect(
      stopDecision([edited('/repo/packages/x/src/a.ts'), ran(command)], PROJECT, false, []),
    ).toBeUndefined()
  })

  it.each([
    ['a run of one file', 'pnpm test packages/x/src/a.spec.ts'],
    ['a run of one project', 'pnpm vitest run --project tooling'],
    ['another script', 'pnpm test:mutation'],
  ])('blocks when only %s followed the change', (_, command) => {
    expect(
      stopDecision([edited('/repo/packages/x/src/a.ts'), ran(command)], PROJECT, false, []),
    ).toEqual(expectedBlock)
  })

  it('blocks when a change followed the last full run', () => {
    expect(
      stopDecision([ran('pnpm test'), edited('/repo/packages/x/src/a.ts')], PROJECT, false, []),
    ).toEqual(expectedBlock)
  })

  it('reads tool uses from Write and MultiEdit too', () => {
    expect(
      stopDecision(
        [
          toolUse('Write', { file_path: '/repo/packages/x/src/a.ts' }),
          toolUse('MultiEdit', { file_path: '/repo/packages/x/src/b.ts' }),
        ],
        PROJECT,
        false,
        [],
      ),
    ).toMatchObject({ reason: expect.stringMatching(/a\.ts.*b\.ts/) })
  })

  it('ignores tool uses that are not the assistant’s', () => {
    const userEntry: TranscriptEntry = {
      type: 'user',
      message: {
        content: [{ type: 'tool_use', name: 'Edit', input: { file_path: 'packages/a.ts' } }],
      },
    }
    expect(stopDecision([userEntry], PROJECT, false, [])).toBeUndefined()
  })

  it('passes an empty transcript', () => {
    expect(stopDecision([], PROJECT, false, [])).toBeUndefined()
  })

  it('blocks when a file changed through Bash after the last full run', () => {
    expect(
      stopDecision([ranAt('pnpm test', RUN_AT)], PROJECT, false, [
        { path: 'packages/x/src/a.ts', mtimeMs: AFTER_RUN },
      ]),
    ).toEqual(expectedBlock)
  })

  it('passes when a file changed through Bash before the last full run', () => {
    expect(
      stopDecision([ranAt('pnpm test', RUN_AT)], PROJECT, false, [
        { path: 'packages/x/src/a.ts', mtimeMs: BEFORE_RUN },
      ]),
    ).toBeUndefined()
  })

  it('blocks when a file changed through Bash and no full run happened', () => {
    expect(
      stopDecision([], PROJECT, false, [{ path: 'packages/x/src/a.ts', mtimeMs: BEFORE_RUN }]),
    ).toEqual(expectedBlock)
  })

  it('passes when only a docs file changed through Bash', () => {
    expect(
      stopDecision([], PROJECT, false, [{ path: '_bmad-output/x.md', mtimeMs: AFTER_RUN }]),
    ).toBeUndefined()
  })
})
