import type { HostCallWrapper } from '../lane/host-call-wrapper'
import type {
  LaneContract,
  LaneFailed,
  LaneProblem,
  NestedBlueprintDeclaration,
} from '../lane/types'
import type { JSValueHandle } from 'quickjs-wasi'

import type { BlueprintVm } from './blueprint-vm'

/** The part of a declaration the host needs; a `BlueprintDeclaration` is assignable to it. */
export interface BlueprintContract extends NestedBlueprintDeclaration {
  version: number
  apiVersion: number
  uses: readonly { id: string }[]
  lanes: Partial<Record<string, LaneContract>>
}

export interface PinnedScript {
  declaration: BlueprintContract
  script: string
}

export interface PinnedBlueprint extends PinnedScript {
  /** Every pinned blueprint it reaches through `uses`, transitively. */
  closure: readonly PinnedScript[]
}

export interface LaneRef {
  id: string
  version: number
  stage: string
}

export interface PoolEntry {
  vm: BlueprintVm
  closureKey: string
  pinned: PinnedBlueprint
}

// callFunction would construct a JSException, which reads the guest's message, name and stack.
export interface RawCalls {
  callFunctionRaw(
    func: JSValueHandle,
    thisVal: JSValueHandle,
    ...args: JSValueHandle[]
  ): JSValueHandle
}

export interface LaneRun {
  stage: string
  wrapper: HostCallWrapper
  nestedProblems: LaneProblem[]
  failure: LaneFailed | undefined
}
