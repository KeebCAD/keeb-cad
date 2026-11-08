import type { Workspace } from '@keeb-cad/schema'
import type { WritableComputedRef } from 'vue'

import type { UiActionHandle } from '../ui-actions/types'

export type ShowWorkspaceHandle = UiActionHandle & { readonly hotkeys: readonly [string] }

export type WorkspaceTab = { value: Workspace; label: string; hotkey: string }

export type UseWorkspaceResult = {
  workspace: WritableComputedRef<Workspace | undefined, string | undefined>
  tabs: readonly WorkspaceTab[]
}
