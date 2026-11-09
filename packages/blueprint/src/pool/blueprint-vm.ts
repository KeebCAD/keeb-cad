import { AsyncResult, Result } from '@keeb-cad/result'
import { QuickJS, type JSValueHandle } from 'quickjs-wasi'

import { checkLaneOutputs } from '../lane/check-lane-outputs'
import { checkNestedInputs } from '../lane/check-nested-inputs'
import { decodeLaneResult } from '../lane/decode-lane-result'
import { HandleTable } from '../lane/handle-table'
import { HostCallWrapper } from '../lane/host-call-wrapper'
import type {
  BuildLaneArgs,
  ConvertHandle,
  LaneArgs,
  LaneFailed,
  LaneFailure,
  LaneOutput,
  StageCalls,
} from '../lane/types'
import { BOUNDARY_SOURCE } from '../sandbox/boundary-source'
import { classifyEscape } from '../sandbox/classify-escape'
import { StepBudget } from '../sandbox/step-budget'
import type { EngineUnavailable, EscapedFromEngine } from '../sandbox/types'
import { vmOptions } from '../sandbox/vm-options'
import type { LaneRun, PinnedBlueprint, PinnedScript, RawCalls } from './types'

export class BlueprintVm {
  static create(
    module: WebAssembly.Module,
    pinned: PinnedBlueprint,
  ): AsyncResult<BlueprintVm, EngineUnavailable> {
    return AsyncResult.fromPromise(BlueprintVm.#start(module, pinned), (): EngineUnavailable => ({
      kind: 'engine-unavailable',
    }))
  }

  runLane(stage: string, calls: StageCalls, args: BuildLaneArgs): Result<LaneOutput, LaneFailure> {
    if (this.#dead) return Result.err({ kind: 'unavailable' })
    const contract = this.#declarationOf(this.#pinned.declaration.id).lanes[stage]
    if (contract === undefined) {
      return Result.err({
        kind: 'lane-failed',
        cause: 'boundary',
        message: `the blueprint declares no ${stage} lane`,
      })
    }

    this.#budget.reset()
    const handles = new HandleTable()
    const run: LaneRun = {
      stage,
      wrapper: new HostCallWrapper(calls.operations, handles),
      nestedProblems: [],
      failure: undefined,
    }
    this.#run = run
    const answer = this.#callEntry(stage, args(handles), Object.keys(calls.operations))
    this.#run = undefined

    try {
      if (answer.isErr()) {
        const { failure, vmDead } = classifyEscape(answer.error, this.#budget)
        // A job queued before the escape would otherwise be blamed on the next clean run.
        this.#dead = vmDead || this.#vm._getExports().qjs_is_job_pending() !== 0
        return Result.err(failure)
      }
      if (this.#vm._getExports().qjs_is_job_pending() !== 0) {
        this.#dead = true
        return Result.err({ kind: 'lane-failed', cause: 'pending-job' })
      }
      return run.failure === undefined
        ? decodeLaneResult(answer.value)
            .flatMap((value) => checkLaneOutputs(contract, value))
            .flatMap((checked) => this.#convert(checked, calls.convertHandle, handles, run))
        : Result.err(run.failure)
    } finally {
      handles.free()
    }
  }

  get isDead(): boolean {
    return this.#dead
  }

  get linearMemoryBytes(): number {
    return this.#vm._getMemory().buffer.byteLength
  }

  get objectCount(): number {
    return this.#vm.getMemoryUsage().objCount
  }

  dispose(): void {
    if (this.#disposed) return
    this.#disposed = true
    this.#dead = true
    // Disposing after a trap can itself trap; the instance is unreachable either way.
    Result.fromThrowing(
      () => {
        this.#entry.dispose()
        this.#vm.dispose()
      },
      () => null,
    )
  }

  private constructor(vm: QuickJS, budget: StepBudget, pinned: PinnedBlueprint) {
    this.#vm = vm
    this.#budget = budget
    this.#pinned = pinned
    this.#scripts = new Map(
      [pinned, ...pinned.closure].map((script) => [script.declaration.id, script]),
    )
    this.#entry = this.#boot()
  }

  static async #start(module: WebAssembly.Module, pinned: PinnedBlueprint): Promise<BlueprintVm> {
    const budget = new StepBudget()
    const vm = await QuickJS.create(vmOptions(module, budget))
    return new BlueprintVm(vm, budget, pinned)
  }

  #boot(): JSValueHandle {
    const vm = this.#vm
    const install = vm.evalCode(BOUNDARY_SOURCE, 'boundary.js')
    const call = this.#hostFunction('call', (name, argsJson) => this.#hostCall(name, argsJson))
    const nestedBegin = this.#hostFunction('nestedBegin', (caller, id, inputs) =>
      this.#nestedBegin(caller, id, inputs),
    )
    const nestedEnd = this.#hostFunction('nestedEnd', (id, answer) => this.#nestedEnd(id, answer))
    const scripts = vm.newString(
      JSON.stringify(
        [...this.#scripts.values()].map(({ declaration, script }) => ({
          id: declaration.id,
          script,
        })),
      ),
    )
    const entry = vm.callFunction(install, vm.undefined, call, nestedBegin, nestedEnd, scripts)
    for (const handle of [install, call, nestedBegin, nestedEnd, scripts]) handle.dispose()
    return entry
  }

  #hostFunction(name: string, body: (...args: string[]) => string): JSValueHandle {
    const vm = this.#vm
    return vm.newFunction(name, (...handles) =>
      vm.newString(body(...handles.map((handle) => handle.toString()))),
    )
  }

  #hostCall(name: string, argsJson: string): string {
    const answer = this.#currentRun().wrapper.call(name, argsJson)
    if (answer.isErr()) {
      // The engine turns a thrown string into a guest error; a host Error would copy its stack in.
      throw answer.error
    }
    return answer.value
  }

  #nestedBegin(caller: string, id: string, inputsJson: string): string {
    const run = this.#currentRun()
    const declaredUses = this.#declarationOf(caller).uses
    const nested = this.#scripts.get(id)
    if (nested === undefined || declaredUses.every((used) => used.id !== id)) {
      return this.#failRun(run, {
        kind: 'lane-failed',
        cause: 'threw',
        message: `use(${id}) is not declared in ${caller}'s uses`,
      })
    }
    const sent = JSON.parse(inputsJson) as { inputs?: unknown; bad?: string }
    if (sent.bad !== undefined) {
      return this.#failRun(run, {
        kind: 'lane-failed',
        cause: 'nested-input',
        blueprint: id,
        input: sent.bad,
      })
    }
    return checkNestedInputs(nested.declaration, sent.inputs).match({
      ok: (inputs) => JSON.stringify({ inputs }),
      err: (failure) => this.#failRun(run, failure),
    })
  }

  #nestedEnd(id: string, answer: string): string {
    const run = this.#currentRun()
    const contract = this.#declarationOf(id).lanes[run.stage]
    if (contract === undefined) {
      return this.#failRun(run, {
        kind: 'lane-failed',
        cause: 'threw',
        message: `${id} declares no ${run.stage} lane`,
      })
    }
    return decodeLaneResult(answer)
      .flatMap((value) => checkLaneOutputs(contract, value))
      .match({
        ok: (checked) => {
          run.nestedProblems.push(
            ...checked.problems.map((problem) => ({ ...problem, blueprint: id })),
          )
          return JSON.stringify({ value: checked })
        },
        err: (failure) => this.#failRun(run, failure),
      })
  }

  #failRun(run: LaneRun, failure: LaneFailed): string {
    run.failure ??= failure
    return JSON.stringify({ error: `use() failed: ${failure.cause}` })
  }

  #callEntry(
    stage: string,
    args: LaneArgs,
    operationNames: string[],
  ): Result<string, EscapedFromEngine> {
    const vm = this.#vm
    const id = this.#pinned.declaration.id
    return Result.fromThrowing(
      () =>
        vm.withScope(() => {
          const raw = vm as unknown as RawCalls
          const result = raw.callFunctionRaw(
            this.#entry,
            vm.undefined,
            vm.newString(id),
            vm.newString(stage),
            vm.newString(JSON.stringify(args)),
            vm.newString(JSON.stringify(operationNames)),
          )
          const exports = vm._getExports()
          if (exports.qjs_is_exception(result.ptr) !== 0) {
            exports.qjs_free_value(exports.qjs_get_exception())
            return Result.err<EscapedFromEngine>({ kind: 'raw-exception' })
          }
          return Result.ok(result.toString())
        }),
      (error): EscapedFromEngine => ({ kind: 'thrown', error }),
    ).match<Result<string, EscapedFromEngine>>({
      ok: (answer) => answer,
      err: (escape) => Result.err(escape),
    })
  }

  #convert(
    checked: LaneOutput,
    convertHandle: ConvertHandle,
    handles: HandleTable,
    run: LaneRun,
  ): Result<LaneOutput, LaneFailed> {
    const outputs: Record<string, unknown> = {}
    for (const [name, value] of Object.entries(checked.outputs)) {
      const converted = Array.isArray(value)
        ? this.#convertEach(name, value as unknown[], convertHandle, handles)
        : convertHandle(name, value, handles)
      if (converted.isErr()) {
        return Result.err({ kind: 'lane-failed', cause: 'role', output: name })
      }
      outputs[name] = converted.value
    }
    return Result.ok({ outputs, problems: [...checked.problems, ...run.nestedProblems] })
  }

  #convertEach(
    name: string,
    values: unknown[],
    convertHandle: ConvertHandle,
    handles: HandleTable,
  ): Result<unknown, string> {
    const converted: unknown[] = []
    for (const value of values) {
      const one = convertHandle(name, value, handles)
      if (one.isErr()) return one
      converted.push(one.value)
    }
    return Result.ok(converted)
  }

  #declarationOf(id: string): PinnedScript['declaration'] {
    return (this.#scripts.get(id) as PinnedScript).declaration
  }

  #currentRun(): LaneRun {
    return this.#run as LaneRun
  }

  readonly #vm: QuickJS
  readonly #budget: StepBudget
  readonly #pinned: PinnedBlueprint
  readonly #scripts: Map<string, PinnedScript>
  readonly #entry: JSValueHandle
  #run: LaneRun | undefined
  #dead = false
  #disposed = false
}
