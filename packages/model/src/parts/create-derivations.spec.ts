import type { LaneFailure, LaneOutput, RunnerLane, StageCalls } from '@keeb-cad/blueprint'
import { argumentHash, blueprintWorkerModule, LaneRunner } from '@keeb-cad/blueprint/worker'
import { Container } from '@keeb-cad/di'
import { shallowRef } from '@keeb-cad/reactive'
import { AsyncResult, Result } from '@keeb-cad/result'
import type { BlueprintDeclaration, Design, LibraryData, ReadonlyRef } from '@keeb-cad/schema'
import {
  aBlueprintDeclaration,
  aBlueprintDesignPart,
  aBlueprintId,
  aChainGroup,
  aDesign,
  aDesignPart,
  aFreeGroup,
  aGap,
  aLayout,
  aLibraryId,
  aLength,
  aLibraryVersion,
  aMeta,
  anOptionInput,
  aPartRef,
  anId,
  aSlot,
  aSlotAnchor,
  aSplitForm,
  aUnibodyForm,
  aVersion,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { blueprintInputInvalidMessage } from '../violations/blueprint-input-invalid-message'
import { dependencyCycleMessage } from '../violations/dependency-cycle-message'
import { unresolvableReferenceMessage } from '../violations/unresolvable-reference-message'
import { unsupportedFormMessage } from '../violations/unsupported-form-message'
import { createDerivations } from './create-derivations'
import { partViolationMessage } from './part-violation-message'

const KEY_RUN = `key@${argumentHash({})}`
const OTHER_RUN = `other@${argumentHash({})}`
const CHOC_KEY = aBlueprintId('lib:blueprint/choc-key')

const rectangle = (value: unknown): Answer => ({ value })
const WIDE = { w: 27, h: 18 }
// Borders are rounded to 1e-6 mm.
const BORDER_DIGITS = 6

type Answer = { value: unknown } | { failure: LaneFailure }

class FakeRunner extends LaneRunner {
  answers: Answer[] = []
  fallback: Answer = rectangle({ w: 18, h: 18 })
  runs: unknown[] = []
  readonly ready = shallowRef(0)

  override get lanesReady(): ReadonlyRef<number> {
    return this.ready
  }

  override runLane(
    _lane: RunnerLane,
    calls: StageCalls,
    { canonical }: { canonical: unknown },
  ): Result<LaneOutput, LaneFailure> {
    this.runs.push(canonical)
    const answer = this.answers.shift() ?? this.fallback
    if ('failure' in answer) return Result.err(answer.failure)
    const converted = calls.convertHandle('rectangle', answer.value, {} as never)
    return converted.isErr()
      ? Result.err({ kind: 'lane-failed', cause: 'role', output: 'rectangle' })
      : Result.ok({ outputs: { rectangle: converted.value }, problems: [] })
  }
}

function aLibrary(ids = [CHOC_KEY], inputs: BlueprintDeclaration['inputs'] = {}): LibraryData {
  const declarations: LibraryData['declarations'] = Object.fromEntries(
    ids.map((id) => [id, { 1: aBlueprintDeclaration({ id, inputs }) }]),
  )
  return { declarations, loadScript: () => AsyncResult.ok('') }
}

async function arrange(design: Design, library: LibraryData = aLibrary()) {
  const container = new Container().addModule(blueprintWorkerModule)
  container.override(LaneRunner).useClass(FakeRunner)
  await container.autoLoad()
  const runner = container.resolve(LaneRunner) as FakeRunner
  const mirror = shallowRef(design)
  const derivations = createDerivations(mirror, library, runner)
  return {
    runner,
    mirror,
    parts: derivations.parts,
    pins: derivations.pins,
    placements: derivations.placements,
    violations: derivations.violations,
  }
}

const onSlots = (...slots: Parameters<typeof aSlot>[0][]) =>
  aLayout({ children: slots.map((slot) => aSlot(slot)) })

const withLayout = (layout: Design['layout'], overrides: Partial<Design> = {}) =>
  aDesign({ layout, ...overrides })

const keyAnd = (other = aBlueprintDesignPart({ id: anId('other') })) => [
  aBlueprintDesignPart(),
  other,
]

const slotId = anId('slot')

// choc-key v1's declared inputs.
const chocKeySize = anOptionInput({
  label: 'Size',
  options: ['1u', '1.5u'],
  default: '1u',
  perSlot: true,
})
const chocKeyInputs: BlueprintDeclaration['inputs'] = { size: chocKeySize }

function unresolved(severity: 'warning' | 'error') {
  const ids = [slotId]
  return {
    kind: 'unresolvable-reference',
    severity,
    ids,
    message: partViolationMessage({ kind: 'unresolvable-reference' }, ids),
    fixes: [],
  }
}

describe('createDerivations', () => {
  it('runs a part a slot uses and holds its rectangle', async () => {
    const { parts } = await arrange(withLayout(onSlots({ id: slotId })))

    expect(parts.value).toMatchObject({
      output: { ids: [KEY_RUN], rows: [{ w: 18, h: 18 }] },
      slots: { [slotId]: { run: KEY_RUN, fit: 'fitted' } },
      violations: [],
    })
  })

  it('runs twice-used inputs once, and differing inputs twice', async () => {
    const same = await arrange(withLayout(onSlots({ id: anId('a') }, { id: anId('b') })))
    const differing = await arrange(
      withLayout(onSlots({ id: anId('a') }, { id: anId('b'), inputs: { size: '1.5u' } })),
      aLibrary([CHOC_KEY], chocKeyInputs),
    )

    expect(same.parts.value.output.rows).toHaveLength(1)
    expect(same.runner.runs).toHaveLength(1)
    expect(differing.parts.value.output.rows).toHaveLength(2)
  })

  it.each([
    ['its own part set', aPartRef('other'), undefined, OTHER_RUN],
    ['an unset part under a group default', undefined, aPartRef('other'), OTHER_RUN],
    ['an unset part with no group default', undefined, undefined, KEY_RUN],
  ])('resolves %s', async (_role, part, defaultPart, expectedRun) => {
    const group = aFreeGroup({
      id: anId('column'),
      ...(defaultPart === undefined ? {} : { defaultPart }),
      children: [aSlot({ id: slotId, ...(part === undefined ? {} : { part }) })],
    })
    const { parts } = await arrange(withLayout(aLayout({ children: [group] }), { parts: keyAnd() }))

    expect(parts.value.slots[slotId]).toEqual({ run: expectedRun, fit: 'fitted' })
  })

  it('takes the nearer of two nested group defaults', async () => {
    const inner = aChainGroup({
      id: anId('inner'),
      defaultPart: aPartRef('other'),
      children: [aSlot({ id: slotId })],
    })
    const outer = aFreeGroup({ id: anId('outer'), defaultPart: aPartRef('key'), children: [inner] })
    const { parts } = await arrange(withLayout(aLayout({ children: [outer] }), { parts: keyAnd() }))

    expect(parts.value.slots[slotId]).toEqual({ run: OTHER_RUN, fit: 'fitted' })
  })

  it('stands a slot naming a missing design part in on the next level, warning', async () => {
    const { parts } = await arrange(withLayout(onSlots({ id: slotId, part: aPartRef('gone') })))

    expect(parts.value.slots[slotId]).toEqual({ run: KEY_RUN, fit: 'stand-in' })
    expect(parts.value.violations).toEqual([unresolved('warning')])
  })

  it('stands in and reports an error for an unknown library part', async () => {
    const { parts } = await arrange(
      withLayout(onSlots({ id: slotId, part: aPartRef('lib:part/x') })),
    )

    expect(parts.value.slots[slotId]).toEqual({ run: KEY_RUN, fit: 'stand-in' })
    expect(parts.value.violations).toEqual([unresolved('error')])
  })

  it.each([
    ['a blueprint with no pin', []],
    ['a pin the declarations lack', [aLibraryVersion({ version: aVersion(9) })]],
  ])('stands in and reports an error for %s', async (_role, libraryVersions) => {
    const { parts } = await arrange(withLayout(onSlots({ id: slotId }), { libraryVersions }))

    expect(parts.value.slots[slotId]).toEqual({ run: 'stand-in', fit: 'stand-in' })
    expect(parts.value.violations).toEqual([unresolved('error')])
  })

  it('reports an authored part as a warning, since milestone 1 has no way to run one', async () => {
    const authored = aDesignPart('authored')
    const { parts } = await arrange(
      withLayout(onSlots({ id: slotId, part: aPartRef(authored.id) }), {
        parts: [aBlueprintDesignPart(), authored],
      }),
    )

    expect(parts.value.violations).toEqual([unresolved('warning')])
  })

  it.each([
    ['lane-failed', { kind: 'lane-failed', cause: 'step-budget' }],
    ['blueprint-api-too-new', { kind: 'blueprint-api-too-new', blueprint: CHOC_KEY }],
  ] as const)('reports only %s for a part with no output', async (_role, failure) => {
    const { parts, runner } = await arrange(withLayout(onSlots({ id: slotId })))
    runner.fallback = { failure }

    const ids = [anId('key'), slotId]
    expect(parts.value.slots[slotId]).toEqual({ run: 'stand-in', fit: 'stand-in' })
    expect(parts.value.violations).toEqual([
      {
        kind: failure.kind,
        severity: 'error',
        ids,
        message: partViolationMessage(failure, ids),
        fixes: [],
      },
    ])
  })

  it('reports only the blueprint violation when the level after a failed part is missing too', async () => {
    const failure = { kind: 'lane-failed', cause: 'step-budget' } as const
    const { parts, runner } = await arrange(
      aDesign({
        meta: aMeta({ defaultPart: aPartRef('gone') }),
        layout: onSlots({ id: slotId, part: aPartRef('other') }),
        parts: keyAnd(),
      }),
    )
    runner.fallback = { failure }

    const ids = [anId('other'), slotId]
    expect(parts.value.slots[slotId]).toEqual({ run: 'stand-in', fit: 'stand-in' })
    expect(parts.value.violations).toEqual([
      {
        kind: failure.kind,
        severity: 'error',
        ids,
        message: partViolationMessage(failure, ids),
        fixes: [],
      },
    ])
  })

  it('lists a slot once when its own part is also the default and the run fails', async () => {
    const { parts, runner } = await arrange(
      withLayout(onSlots({ id: slotId, part: aPartRef('key') })),
    )
    runner.fallback = { failure: { kind: 'lane-failed', cause: 'step-budget' } }

    expect(parts.value.violations.map(({ ids }) => ids)).toEqual([[anId('key'), slotId]])
  })

  it('stands in with no violation for an unavailable run', async () => {
    const { parts, runner } = await arrange(withLayout(onSlots({ id: slotId })))
    runner.fallback = { failure: { kind: 'unavailable' } }

    expect(parts.value.slots[slotId]).toEqual({ run: 'stand-in', fit: 'stand-in' })
    expect(parts.value.violations).toEqual([])
  })

  it('runs and reports nothing for a design with no slots', async () => {
    const { parts, runner } = await arrange(aDesign())

    expect(parts.value).toMatchObject({
      output: { ids: [], rows: [] },
      slots: {},
      violations: [],
    })
    expect(runner.runs).toEqual([])
  })

  it('reports one violation per failed run, the part then its slots in compareId order', async () => {
    const { parts, runner } = await arrange(
      withLayout(onSlots({ id: anId('zed') }, { id: anId('abe') })),
    )
    runner.fallback = { failure: { kind: 'lane-failed', cause: 'step-budget' } }

    expect(parts.value.violations).toEqual([
      expect.objectContaining({
        severity: 'error',
        fixes: [],
        ids: [anId('key'), anId('abe'), anId('zed')],
      }),
    ])
  })

  it('runs no lane for an edit to the name alone', async () => {
    const { parts, runner, mirror } = await arrange(withLayout(onSlots({ id: slotId })))
    void parts.value
    const before = runner.runs.length

    mirror.value = { ...mirror.value, meta: { ...mirror.value.meta, name: 'Other' } }

    expect(parts.value.slots[slotId]).toEqual({ run: KEY_RUN, fit: 'fitted' })
    expect(runner.runs.length).toBe(before)
  })

  it("gives a slot the app-defined 18 mm stand-in when meta.defaultPart doesn't resolve", async () => {
    const { parts } = await arrange(
      withLayout(onSlots({ id: slotId }), {
        meta: aMeta({ defaultPart: aPartRef('gone') }),
        parts: [],
      }),
    )

    expect(parts.value.output).toEqual({ ids: ['stand-in'], rows: [{ w: 18, h: 18 }] })
    expect(parts.value.slots[slotId]).toEqual({ run: 'stand-in', fit: 'stand-in' })
  })

  it('sorts the runs by compareId, each row at its id', async () => {
    const zed = aBlueprintDesignPart({ id: anId('zed') })
    const abe = aBlueprintDesignPart({ id: anId('abe') })
    const { parts, runner } = await arrange(
      withLayout(
        onSlots(
          { id: anId('first'), part: aPartRef('zed') },
          { id: anId('second'), part: aPartRef('abe') },
        ),
        { parts: [aBlueprintDesignPart(), zed, abe] },
      ),
    )
    runner.answers = [rectangle({ w: 30, h: 18 }), rectangle({ w: 10, h: 18 })]

    expect(parts.value.output).toEqual({
      ids: [`abe@${argumentHash({})}`, `zed@${argumentHash({})}`],
      rows: [
        { w: 10, h: 18 },
        { w: 30, h: 18 },
      ],
    })
  })

  it('has no stand-in row when every slot resolved', async () => {
    const { parts } = await arrange(withLayout(onSlots({ id: slotId })))

    expect(parts.value.output.ids).toEqual([KEY_RUN])
  })

  describe("on choc-key's declared inputs", () => {
    const chocKey = () => aLibrary([CHOC_KEY], chocKeyInputs)

    it('stands a slot with a size outside the options in on the app stand-in, reporting it once', async () => {
      const { parts } = await arrange(
        withLayout(onSlots({ id: slotId, inputs: { size: '2u' } })),
        chocKey(),
      )

      const ids = [slotId]
      expect({ slot: parts.value.slots[slotId], violations: parts.value.violations }).toEqual({
        slot: { run: 'stand-in', fit: 'stand-in' },
        violations: [
          {
            kind: 'blueprint-input-invalid',
            severity: 'error',
            ids,
            message: blueprintInputInvalidMessage({
              owner: { scope: 'slot', id: slotId },
              input: 'size',
              reason: 'bad-value',
              value: '2u',
              expected: chocKeySize,
            }),
            fixes: [],
          },
        ],
      })
    })

    it("runs a slot's per-slot size and fits it on that run", async () => {
      const { parts, runner } = await arrange(
        withLayout(onSlots({ id: slotId, inputs: { size: '1.5u' } })),
        chocKey(),
      )
      runner.fallback = rectangle(WIDE)

      const run = `key@${argumentHash({ size: '1.5u' })}`
      expect({
        output: parts.value.output,
        slot: parts.value.slots[slotId],
        runs: runner.runs,
      }).toEqual({
        output: { ids: [run], rows: [WIDE] },
        slot: { run, fit: 'fitted' },
        runs: [{ size: '1.5u' }],
      })
    })

    it('hashes the declared default into the run id of a slot with no inputs', async () => {
      const { parts } = await arrange(withLayout(onSlots({ id: slotId })), chocKey())

      expect(parts.value.slots[slotId]).toEqual({
        run: `key@${argumentHash({ size: '1u' })}`,
        fit: 'fitted',
      })
    })

    it("reports a part's input fault once, for the part, and stands each of its slots in", async () => {
      const { parts } = await arrange(
        withLayout(onSlots({ id: anId('a') }, { id: anId('b') }), {
          parts: [aBlueprintDesignPart({ inputs: { size: '2u' } })],
        }),
        chocKey(),
      )

      const ids = [anId('key')]
      expect({ slots: parts.value.slots, violations: parts.value.violations }).toEqual({
        slots: {
          [anId('a')]: { run: 'stand-in', fit: 'stand-in' },
          [anId('b')]: { run: 'stand-in', fit: 'stand-in' },
        },
        violations: [
          {
            kind: 'blueprint-input-invalid',
            severity: 'error',
            ids,
            message: blueprintInputInvalidMessage({
              owner: { scope: 'part', id: anId('key') },
              input: 'size',
              reason: 'bad-value',
              value: '2u',
              expected: chocKeySize,
            }),
            fixes: [],
          },
        ],
      })
    })

    it("reports a slot's input fault once when every level refuses it", async () => {
      const { parts } = await arrange(
        aDesign({
          meta: aMeta({ defaultPart: aPartRef('other') }),
          layout: onSlots({ id: slotId, part: aPartRef('key'), inputs: { colour: 'red' } }),
          parts: keyAnd(),
        }),
        aLibrary([CHOC_KEY], chocKeyInputs),
      )

      const ids = [slotId]
      expect({ slot: parts.value.slots[slotId], violations: parts.value.violations }).toEqual({
        slot: { run: 'stand-in', fit: 'stand-in' },
        violations: [
          {
            kind: 'blueprint-input-invalid',
            severity: 'error',
            ids,
            message: blueprintInputInvalidMessage({
              owner: { scope: 'slot', id: slotId },
              input: 'colour',
              reason: 'unknown',
            }),
            fixes: [],
          },
        ],
      })
    })

    it('reports a faulty design part no slot uses, once, for the part', async () => {
      const unused = aBlueprintDesignPart({ id: anId('other'), inputs: { colour: 'red' } })
      const { violations } = await arrange(
        withLayout(onSlots({ id: slotId }), { parts: [aBlueprintDesignPart(), unused] }),
        chocKey(),
      )

      expect(violations.value).toEqual([
        {
          kind: 'blueprint-input-invalid',
          severity: 'error',
          ids: [anId('other')],
          message: blueprintInputInvalidMessage({
            owner: { scope: 'part', id: anId('other') },
            input: 'colour',
            reason: 'unknown',
          }),
          fixes: [],
        },
      ])
    })

    it("checks a slot under a faulty first part against that part's declaration", async () => {
      const plain = aBlueprintId('lib:blueprint/plain')
      const library: LibraryData = {
        declarations: Object.fromEntries([
          [CHOC_KEY, { 1: aBlueprintDeclaration({ id: CHOC_KEY, inputs: chocKeyInputs }) }],
          [plain, { 1: aBlueprintDeclaration({ id: plain }) }],
        ]),
        loadScript: () => AsyncResult.ok(''),
      }
      const faultyFirst = aBlueprintDesignPart({ id: anId('other'), inputs: { size: '2u' } })
      const { parts } = await arrange(
        aDesign({
          libraryVersions: [aLibraryVersion(), aLibraryVersion({ id: aLibraryId(plain) })],
          parts: [aBlueprintDesignPart({ blueprint: plain }), faultyFirst],
          layout: onSlots({ id: slotId, part: aPartRef('other'), inputs: { size: '2u' } }),
        }),
        library,
      )

      const badSize = {
        input: 'size',
        reason: 'bad-value',
        value: '2u',
        expected: chocKeySize,
      } as const
      expect({ slot: parts.value.slots[slotId], violations: parts.value.violations }).toEqual({
        slot: { run: 'stand-in', fit: 'stand-in' },
        violations: [
          {
            kind: 'blueprint-input-invalid',
            severity: 'error',
            ids: [anId('other')],
            message: blueprintInputInvalidMessage({
              owner: { scope: 'part', id: anId('other') },
              ...badSize,
            }),
            fixes: [],
          },
          {
            kind: 'blueprint-input-invalid',
            severity: 'error',
            ids: [slotId],
            message: blueprintInputInvalidMessage({
              owner: { scope: 'slot', id: slotId },
              ...badSize,
            }),
            fixes: [],
          },
        ],
      })
    })
  })

  describe('the rectangle value', () => {
    it.each([
      ['w just below 0', { w: -0.001, h: 18 }, ['stand-in'], ['lane-failed']],
      ['w on 0', { w: 0, h: 18 }, ['stand-in'], ['lane-failed']],
      ['w just above 0', { w: 0.001, h: 18 }, [KEY_RUN], []],
      ['h just below 0', { w: 18, h: -0.001 }, ['stand-in'], ['lane-failed']],
      ['h on 0', { w: 18, h: 0 }, ['stand-in'], ['lane-failed']],
      ['h just above 0', { w: 18, h: 0.001 }, [KEY_RUN], []],
      ['a non-number w', { w: 'x', h: 18 }, ['stand-in'], ['lane-failed']],
      ['no h', { w: 18 }, ['stand-in'], ['lane-failed']],
      ['an empty object', {}, ['stand-in'], ['lane-failed']],
    ])('on %s', async (_role, value, expectedIds, expectedKinds) => {
      const { parts, runner } = await arrange(withLayout(onSlots({ id: slotId })))
      runner.fallback = rectangle(value)

      const rowIds = parts.value.output.ids

      expect(rowIds).toEqual(expectedIds)
      expect(parts.value.violations.map(({ kind }) => kind)).toEqual(expectedKinds)
    })
  })

  it('leaves stand-in when a run was unavailable and the retry succeeds', async () => {
    const { parts, runner } = await arrange(withLayout(onSlots({ id: slotId })))
    runner.answers = [{ failure: { kind: 'unavailable' } }]
    expect(parts.value.slots[slotId]?.fit).toBe('stand-in')

    runner.ready.value += 1

    expect(parts.value.slots[slotId]).toEqual({ run: KEY_RUN, fit: 'fitted' })
  })

  it('runs no lane when the pins are read', async () => {
    const { pins, runner } = await arrange(withLayout(onSlots({ id: slotId })))

    void pins.value

    expect(runner.runs).toEqual([])
  })

  it('takes pins from library-versions, blueprints only', async () => {
    const { pins } = await arrange(
      aDesign({
        libraryVersions: [aLibraryVersion(), aLibraryVersion({ id: aLibraryId('lib:part/x') })],
      }),
    )

    expect(pins.value).toEqual([{ id: CHOC_KEY, version: aVersion() }])
  })

  describe('placements', () => {
    it('keeps the same output for an edit to the name alone', async () => {
      const { placements, mirror } = await arrange(withLayout(onSlots({ id: slotId })))
      const before = placements.value

      mirror.value = { ...mirror.value, meta: { ...mirror.value.meta, name: 'Other' } }

      expect(placements.value).toBe(before)
    })

    it('recomputes for an edit to the gap', async () => {
      const { placements, mirror } = await arrange(withLayout(onSlots({ id: slotId })))
      const before = placements.value
      const gap = aGap({ y: aLength('2mm') })

      mirror.value = { ...mirror.value, meta: { ...mirror.value.meta, gap } }

      expect(placements.value).not.toBe(before)
    })

    it("posts a group's border at the margin of the design's gap, and none for its key", async () => {
      const layout = aLayout({
        children: [aFreeGroup({ id: anId('g'), children: [aSlot({ id: anId('k') })] })],
      })
      const gap = aGap({ x: aLength('2mm'), y: aLength('1.5mm') })
      const { placements } = await arrange(withLayout(layout, { meta: aMeta({ gap }) }))

      const rowOf = (id: string) => placements.value.rows[placements.value.ids.indexOf(id)]
      const outerBounds = (rowOf('left/g')?.border ?? []).map(({ outer }) => ({
        minX: Math.min(...outer.map(({ x }) => x)),
        minY: Math.min(...outer.map(({ y }) => y)),
        maxX: Math.max(...outer.map(({ x }) => x)),
        maxY: Math.max(...outer.map(({ y }) => y)),
      }))

      expect({ group: outerBounds, key: rowOf('left/k')?.border }).toEqual({
        group: [
          {
            minX: expect.closeTo(-10.5, BORDER_DIGITS),
            minY: expect.closeTo(-10.5, BORDER_DIGITS),
            maxX: expect.closeTo(10.5, BORDER_DIGITS),
            maxY: expect.closeTo(10.5, BORDER_DIGITS),
          },
        ],
        key: [],
      })
    })
  })

  describe('the form', () => {
    const threeSlots = () => onSlots({ id: anId('a') }, { id: anId('b') }, { id: anId('c') })
    const zeroRows = () => ({ ids: [], rows: [] })

    it('gives zero-row parts and placements for an unsupported form', async () => {
      const { parts, placements } = await arrange(
        withLayout(threeSlots(), { meta: aMeta({ form: aUnibodyForm() }) }),
      )

      expect({ parts: parts.value.output, placements: placements.value }).toEqual({
        parts: zeroRows(),
        placements: zeroRows(),
      })
    })

    it('places every slot for split with board reversible', async () => {
      const { parts, placements } = await arrange(
        withLayout(threeSlots(), { meta: aMeta({ form: aSplitForm({ board: 'reversible' }) }) }),
      )

      expect({ parts: parts.value.output.ids, placements: placements.value.ids }).toEqual({
        parts: [KEY_RUN],
        placements: [
          'left/a',
          'left/b',
          'left/c',
          'left/root',
          'right/a',
          'right/b',
          'right/c',
          'right/root',
        ],
      })
    })

    it('runs no lane for an unsupported form', async () => {
      const { parts, placements, runner } = await arrange(
        withLayout(threeSlots(), { meta: aMeta({ form: aUnibodyForm() }) }),
      )

      void parts.value
      void placements.value

      expect(runner.runs).toEqual([])
    })

    it('drops every placement when a whole design replaces the form with an unsupported one', async () => {
      const { placements, mirror } = await arrange(withLayout(threeSlots()))
      const before = placements.value.ids

      mirror.value = withLayout(threeSlots(), { meta: aMeta({ form: aUnibodyForm() }) })

      expect({ before, after: placements.value }).toEqual({
        before: [
          'left/a',
          'left/b',
          'left/c',
          'left/root',
          'right/a',
          'right/b',
          'right/c',
          'right/root',
        ],
        after: zeroRows(),
      })
    })
  })

  describe('violations', () => {
    // slot names a missing part, a and b anchor to each other, n to a missing id.
    const faulty = () =>
      onSlots(
        { id: slotId, part: aPartRef('gone') },
        { id: anId('a'), anchor: aSlotAnchor({ ref: anId('b') }) },
        { id: anId('b'), anchor: aSlotAnchor({ ref: anId('a') }) },
        { id: anId('n'), anchor: aSlotAnchor({ ref: anId('missing') }) },
      )

    it("lists the parts' violations, then the cycle's, then the dangling anchor's", async () => {
      const { violations } = await arrange(withLayout(faulty()))

      const cycle = [anId('a'), anId('b')]
      const dangling = [anId('n')]
      expect(violations.value).toEqual([
        unresolved('warning'),
        {
          kind: 'dependency-cycle',
          severity: 'error',
          ids: cycle,
          message: dependencyCycleMessage(cycle),
          fixes: [],
        },
        {
          kind: 'unresolvable-reference',
          severity: 'error',
          ids: dangling,
          message: unresolvableReferenceMessage('anchor', dangling),
          fixes: [],
        },
      ])
    })

    it('leaves the cycle and the dangling anchor unplaced', async () => {
      const { placements } = await arrange(withLayout(faulty()))

      expect(placements.value).toMatchObject({
        ids: [
          'left/a',
          'left/b',
          'left/n',
          'left/root',
          `left/${slotId}`,
          'right/a',
          'right/b',
          'right/n',
          'right/root',
          `right/${slotId}`,
        ],
        rows: [
          { placed: false },
          { placed: false },
          { placed: false },
          { placed: true },
          { placed: true },
          { placed: false },
          { placed: false },
          { placed: false },
          { placed: true },
          { placed: true },
        ],
      })
    })

    it('keeps the same list for an edit to the name alone', async () => {
      const { violations, mirror } = await arrange(withLayout(faulty()))
      const before = violations.value

      mirror.value = { ...mirror.value, meta: { ...mirror.value.meta, name: 'Other' } }

      expect(violations.value).toBe(before)
    })

    it.each([
      ['split with board mirrored', aSplitForm({ board: 'mirrored' })],
      ['unibody', aUnibodyForm()],
    ])(
      'reports only unsupported-form, naming the design, and places nothing for %s',
      async (_role, form) => {
        const design = anId('d')
        const { violations, placements } = await arrange(
          withLayout(faulty(), { meta: aMeta({ id: design, form }) }),
        )

        expect({ violations: violations.value, placements: placements.value }).toEqual({
          violations: [
            {
              kind: 'unsupported-form',
              severity: 'error',
              ids: [design],
              message: unsupportedFormMessage([design]),
              fixes: [],
            },
          ],
          placements: { ids: [], rows: [] },
        })
      },
    )

    it('reports no unsupported-form and places both sides for split with board reversible', async () => {
      const { violations, placements } = await arrange(
        withLayout(onSlots({ id: anId('a') }), {
          meta: aMeta({ form: aSplitForm({ board: 'reversible' }) }),
        }),
      )

      expect({ violations: violations.value, placements: placements.value.ids }).toEqual({
        violations: [],
        placements: ['left/a', 'left/root', 'right/a', 'right/root'],
      })
    })
  })
})
