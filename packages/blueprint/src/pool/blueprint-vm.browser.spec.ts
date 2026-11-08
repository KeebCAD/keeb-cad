import { describe, expect, it, onTestFinished } from 'vitest'

import type { BlueprintContract, PinnedBlueprint, PinnedScript } from './types'
import { BlueprintVm } from './blueprint-vm'
import { EngineLoader } from '../sandbox/engine-loader'
import {
  aPin,
  aScript,
  laneFailed,
  MIB,
  noArgs,
  withInputs,
  noCalls,
  okValue,
  returning,
  STAGE,
} from '../testing/a-pinned-blueprint'
import { errOf, okOf, outcomeOf } from '../testing/outcome'

async function vmFor(pin: PinnedBlueprint): Promise<BlueprintVm> {
  const module = await new EngineLoader().load()
  if (module.isErr()) throw new Error('the engine did not load')
  const created = await BlueprintVm.create(module.value, pin)
  if (created.isErr()) throw new Error('the VM did not start')
  onTestFinished(() => created.value.dispose())
  return created.value
}

async function run(
  body: string,
  overrides: Partial<BlueprintContract> = {},
  closure: readonly PinnedScript[] = [],
) {
  const vm = await vmFor(aPin(body, overrides, closure))
  return outcomeOf(vm.runLane(STAGE, noCalls, noArgs))
}

const ok = returning('1')

describe('the sandbox, on the real engine', () => {
  describe('budgets', () => {
    it('stops a runaway at the step budget and answers the next run', async () => {
      const vm = await vmFor(aPin(`if (args.inputs.spin) { while (true) {} } ${ok}`))
      expect(outcomeOf(vm.runLane(STAGE, noCalls, withInputs({ spin: true })))).toEqual(
        laneFailed({ cause: 'step-budget' }),
      )
      expect(outcomeOf(vm.runLane(STAGE, noCalls, noArgs))).toEqual(okValue(1))
    })

    it('keeps the escape as the failure and retires a VM with a job queued before it', async () => {
      const vm = await vmFor(aPin(`Promise.resolve().then(() => 1); while (true) {}`))
      expect(outcomeOf(vm.runLane(STAGE, noCalls, noArgs))).toEqual(
        laneFailed({ cause: 'step-budget' }),
      )
      expect(outcomeOf(vm.runLane(STAGE, noCalls, noArgs))).toEqual(errOf({ kind: 'unavailable' }))
    })

    it('stops a runaway a blueprint tries to catch', async () => {
      await expect(run(`try { while (true) {} } catch { ${ok} }`)).resolves.toEqual(
        laneFailed({ cause: 'step-budget' }),
      )
    })

    it.each([
      ['just below the limit', 63, okValue(1)],
      ['on the limit', 64, laneFailed({ cause: 'out-of-memory' })],
      ['just above the limit', 65, laneFailed({ cause: 'out-of-memory' })],
    ])('a buffer %s', async (_role, mib, expected) => {
      await expect(run(`new ArrayBuffer(${String(mib * MIB)}); ${ok}`)).resolves.toEqual(expected)
    })

    it('fails an allocation loop out of memory and answers the next run', async () => {
      const vm = await vmFor(
        aPin(
          `if (args.inputs.grow) { const a = []; while (true) a.push(new Array(4096).fill(1.5)) } ${ok}`,
        ),
      )
      expect(outcomeOf(vm.runLane(STAGE, noCalls, withInputs({ grow: true })))).toEqual(
        laneFailed({ cause: 'out-of-memory' }),
      )
      expect(outcomeOf(vm.runLane(STAGE, noCalls, noArgs))).toEqual(okValue(1))
    })

    it('fails unbounded recursion as a throw and answers the next run', async () => {
      const vm = await vmFor(aPin(`if (args.inputs.deep) { const f = () => f(); f() } ${ok}`))
      expect(outcomeOf(vm.runLane(STAGE, noCalls, withInputs({ deep: true })))).toEqual(
        laneFailed({ cause: 'threw', message: expect.any(String) as string }),
      )
      expect(outcomeOf(vm.runLane(STAGE, noCalls, noArgs))).toEqual(okValue(1))
    })
  })

  describe('fresh instances', () => {
    it('gives the same output for the same input, whatever ran before', async () => {
      const vm = await vmFor({
        ...aScript(ok),
        script: `(() => { let state = 0; return { lanes: { ${STAGE}(args, op) { state += 1; return { outputs: { value: state }, problems: [] } } } } })()`,
        closure: [],
      })
      expect(outcomeOf(vm.runLane(STAGE, noCalls, noArgs))).toEqual(okValue(1))
      expect(outcomeOf(vm.runLane(STAGE, noCalls, noArgs))).toEqual(okValue(1))
    })
  })

  describe('the allow-listed scope', () => {
    const ALLOWED =
      'AggregateError Array ArrayBuffer AsyncDisposableStack BigInt BigInt64Array BigUint64Array Boolean DataView DisposableStack Error EvalError Float16Array Float32Array Float64Array Function Infinity Int16Array Int32Array Int8Array Iterator JSON Map Math NaN Number Object Promise Proxy RangeError ReferenceError Reflect RegExp Set SharedArrayBuffer String SuppressedError Symbol SyntaxError TypeError URIError Uint16Array Uint32Array Uint8Array Uint8ClampedArray WeakMap WeakSet decodeURI decodeURIComponent encodeURI encodeURIComponent escape eval globalThis isFinite isNaN parseFloat parseInt undefined unescape use'.split(
        ' ',
      )

    const WALK = `
      let caught
      try { new ArrayBuffer(68157440) } catch (error) { caught = error }
      const internalError = caught.constructor.name
      const shapes = [
        function* () {}, async function () {}, async function* () {},
        [][Symbol.iterator](), new Map()[Symbol.iterator](),
        new Set()[Symbol.iterator](), ''[Symbol.iterator](), /a/[Symbol.matchAll](''),
        [].values().map((x) => x), Iterator.from({ next() { return { done: true } } }),
        Iterator.concat(), caught,
      ]
      const seen = new Set(); const pending = [globalThis, ...shapes.map(Object.getPrototypeOf)]; let unfrozen = 0
      while (pending.length > 0) {
        const o = pending.pop()
        if (o === null || (typeof o !== 'object' && typeof o !== 'function') || seen.has(o)) continue
        seen.add(o)
        if (!Object.isFrozen(o)) unfrozen += 1
        pending.push(Object.getPrototypeOf(o))
        for (const key of Reflect.ownKeys(o)) {
          const d = Object.getOwnPropertyDescriptor(o, key)
          if (Object.hasOwn(d, 'value')) pending.push(d.value); else pending.push(d.get, d.set)
        }
      }`

    it('has exactly the listed names on the global object', async () => {
      await expect(
        run(returning('JSON.stringify(Reflect.ownKeys(globalThis).map(String).sort())')),
      ).resolves.toEqual(okValue(JSON.stringify(ALLOWED)))
    })

    it("freezes every reachable object, closes the global object and reaches the engine's error type", async () => {
      await expect(
        run(
          `${WALK}; ${returning('JSON.stringify([unfrozen, Object.isExtensible(globalThis), internalError])')}`,
        ),
      ).resolves.toEqual(okValue(JSON.stringify([0, false, 'InternalError'])))
    })

    it('has no Math.random', async () => {
      await expect(run(returning('typeof Math.random'))).resolves.toEqual(okValue('undefined'))
    })

    it('runs blueprints in strict mode', async () => {
      await expect(run(`undeclared = 1; ${ok}`)).resolves.toEqual(
        laneFailed({ cause: 'threw', message: expect.stringContaining('undeclared') as string }),
      )
    })

    it.each([
      ['Error', "'x'"],
      ['TypeError', "'x'"],
      ['RangeError', "'x'"],
      ['SyntaxError', "'x'"],
      ['ReferenceError', "'x'"],
      ['EvalError', "'x'"],
      ['URIError', "'x'"],
      ['AggregateError', "[], 'x'"],
      ['SuppressedError', "1, 2, 'x'"],
    ])(
      'lets a subclass of %s set its own name despite the frozen prototype',
      async (base, superArguments) => {
        await expect(
          run(
            `class E extends ${base} { constructor() { super(${superArguments}); this.name = 'E' } }; throw new E()`,
          ),
        ).resolves.toEqual(laneFailed({ cause: 'threw', message: 'E: x' }))
      },
    )

    it('keeps nothing a run sets on the stack-trace hooks of Error', async () => {
      const vm = await vmFor(
        aPin(
          `if (args.inputs.set) { try { Error.stackTraceLimit = 0; Error.prepareStackTrace = () => 'hooked' } catch {} } ${returning("new Error('x').stack")}`,
        ),
      )
      const before = outcomeOf(vm.runLane(STAGE, noCalls, noArgs))
      vm.runLane(STAGE, noCalls, withInputs({ set: true }))
      expect(outcomeOf(vm.runLane(STAGE, noCalls, noArgs))).toEqual(before)
    })
  })

  describe('crossing the boundary', () => {
    it.each([
      ['NaN', 'NaN', '$.outputs.value'],
      ['Infinity', 'Infinity', '$.outputs.value'],
      ['-Infinity', '-Infinity', '$.outputs.value'],
      ['-0', '-0', '$.outputs.value'],
      ['undefined', 'undefined', '$.outputs.value'],
      ['a function', '() => 1', '$.outputs.value'],
    ])('fails %s, naming its path', async (_role, expression, path) => {
      await expect(run(returning(expression))).resolves.toEqual(
        laneFailed({ cause: 'not-json-exact', path }),
      )
    })

    it.each([
      ['empty', 0, 0],
      ['just below the cut', 499, 499],
      ['on the cut', 500, 500],
      ['just above the cut', 501, 500],
    ])('cuts a thrown message: %s', async (_role, length, expectedLength) => {
      await expect(run(`throw 'x'.repeat(${String(length)})`)).resolves.toEqual(
        laneFailed({ cause: 'threw', message: 'x'.repeat(expectedLength) }),
      )
    })

    it('cuts through a surrogate pair at the limit and still parses', async () => {
      await expect(run(String.raw`throw 'x'.repeat(499) + '\u{1F600}'`)).resolves.toEqual(
        laneFailed({ cause: 'threw', message: `${'x'.repeat(499)}\u{D83D}` }),
      )
    })

    it('calls no operation from a getter on a thrown object', async () => {
      const calls: string[] = []
      const vm = await vmFor(
        aPin(
          `const thrown = Object.create(Error.prototype); Object.defineProperty(thrown, 'message', { get() { op.spy(); return 'got' } }); throw thrown`,
        ),
      )
      const result = vm.runLane(
        STAGE,
        { ...noCalls, operations: { spy: () => calls.push('spy') } },
        noArgs,
      )
      expect(outcomeOf(result)).toEqual(
        laneFailed({ cause: 'threw', message: 'a thrown value could not be converted to text' }),
      )
      expect(calls).toEqual([])
    })

    it('reads no getter of a returned object and calls no operation from it', async () => {
      const calls: string[] = []
      const vm = await vmFor(
        aPin(`return { outputs: { get value() { op.spy(); return 1 } }, problems: [] }`),
      )
      const result = vm.runLane(
        STAGE,
        { ...noCalls, operations: { spy: () => calls.push('spy') } },
        noArgs,
      )
      expect(outcomeOf(result)).toEqual(
        laneFailed({ cause: 'not-json-exact', path: '$.outputs.value' }),
      )
      expect(calls).toEqual([])
    })
  })

  describe('operations', () => {
    it('crosses arguments and results as JSON and hands out handles', async () => {
      const vm = await vmFor(aPin(`const h = op.rect(2, 3); ${returning('op.area(h)')}`))
      const calls = {
        ...noCalls,
        operations: {
          rect: ([w, h]: readonly unknown[], handles: { add(value: unknown): number }) =>
            handles.add({ w, h }),
          area: ([handle]: readonly unknown[], handles: { get(h: number): unknown }) => {
            const shape = handles.get(Number(handle)) as { value: { w: number; h: number } }
            return shape.value.w * shape.value.h
          },
        },
      }
      expect(outcomeOf(vm.runLane(STAGE, calls, noArgs))).toEqual(okValue(6))
    })

    it('turns a host failure into a guest throw carrying the message', async () => {
      const vm = await vmFor(aPin(`try { op.bad() } catch (e) { ${returning('String(e)')} }`))
      const calls = {
        ...noCalls,
        operations: {
          bad: () => {
            throw new Error('no shape 42')
          },
        },
      }
      expect(outcomeOf(vm.runLane(STAGE, calls, noArgs))).toEqual(
        okValue(expect.stringContaining('no shape 42')),
      )
    })
  })

  describe('nesting', () => {
    const nestedId = 'lib:blueprint/nested'
    const nested = (body: string, overrides: Partial<BlueprintContract> = {}) =>
      aScript(body, { id: nestedId, ...overrides })
    const usesNested = { uses: [{ id: nestedId }] }

    it("returns the nested lane's checked outputs", async () => {
      await expect(
        run(returning(`use('${nestedId}', {}).outputs.value`), usesNested, [
          nested(returning('7')),
        ]),
      ).resolves.toEqual(okValue(7))
    })

    it('fails the run on a use() of an id not in uses, even when caught', async () => {
      await expect(
        run(`try { use('${nestedId}', {}) } catch {} ${ok}`, {}, [nested(ok)]),
      ).resolves.toEqual(
        laneFailed({
          cause: 'threw',
          message: expect.stringContaining('not declared') as string,
        }),
      )
    })

    it("hides the caller's closure, arguments and globals from a nested blueprint", async () => {
      const vm = await vmFor(
        aPin(
          `const secret = args.inputs.callerInput; ${returning(`use('${nestedId}', {}).outputs.value`)}`,
          usesNested,
          [
            nested(
              returning(
                `JSON.stringify([typeof secret, Object.keys(args.inputs).length, typeof globalThis.secret])`,
              ),
            ),
          ],
        ),
      )
      expect(outcomeOf(vm.runLane(STAGE, noCalls, withInputs({ callerInput: 5 })))).toEqual(
        okValue(JSON.stringify(['undefined', 0, 'undefined'])),
      )
    })

    it('never runs the toString of a non-string id', async () => {
      const calls: string[] = []
      const vm = await vmFor(
        aPin(
          `try { use({ toString() { op.spy(); return 'x' } }, {}) } catch {} ${ok}`,
          usesNested,
          [nested(ok)],
        ),
      )
      const result = vm.runLane(
        STAGE,
        { ...noCalls, operations: { spy: () => calls.push('spy') } },
        noArgs,
      )
      expect(outcomeOf(result)).toEqual(
        laneFailed({ cause: 'threw', message: expect.stringContaining('not declared') as string }),
      )
      expect(calls).toEqual([])
    })

    it.each([
      ['a function', '() => 1', '(inputs)'],
      ['a Symbol', "Symbol('x')", '(inputs)'],
      ['a BigInt', '1n', '(inputs)'],
      ['a cycle', '(() => { const inputs = {}; inputs.self = inputs; return inputs })()', 'self'],
      ['an object with a function property', '{ width: () => 1 }', 'width'],
      ['an object with a NaN property', '{ width: NaN }', 'width'],
    ])('fails the run when the inputs are %s, even when caught', async (_role, inputs, input) => {
      await expect(
        run(`try { use('${nestedId}', ${inputs}) } catch {} ${ok}`, usesNested, [nested(ok)]),
      ).resolves.toEqual(laneFailed({ cause: 'nested-input', blueprint: nestedId, input }))
    })

    it('gives a nested lane 0 for an input of -0', async () => {
      await expect(
        run(returning(`use('${nestedId}', { width: -0 }).outputs.value`), usesNested, [
          nested(returning('Object.is(args.inputs.width, 0)'), {
            inputs: { width: { kind: 'quantity', default: { value: '1mm' } } },
          }),
        ]),
      ).resolves.toEqual(okValue(true))
    })

    it('fails the run on a bad nested input, naming blueprint and input', async () => {
      await expect(
        run(`try { use('${nestedId}', { width: 'wide' }) } catch {} ${ok}`, usesNested, [
          nested(ok, { inputs: { width: { kind: 'quantity', default: { value: '1mm' } } } }),
        ]),
      ).resolves.toEqual(laneFailed({ cause: 'nested-input', blueprint: nestedId, input: 'width' }))
    })

    it('joins nested problems to the caller, naming the nested blueprint', async () => {
      const vm = await vmFor(
        aPin(returning(`(use('${nestedId}', {}), 1)`), usesNested, [
          nested(
            `return { outputs: { value: 1 }, problems: [{ message: 'tight', severity: 'warning' }] }`,
          ),
        ]),
      )
      expect(outcomeOf(vm.runLane(STAGE, noCalls, noArgs))).toEqual(
        okOf({
          outputs: { value: 1 },
          problems: [{ message: 'tight', severity: 'warning', blueprint: nestedId }],
        }),
      )
    })
  })
})
