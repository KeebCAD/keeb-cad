import { useService } from '@keeb-cad/di/vue'
import { workspaceSchema } from '@keeb-cad/schema'
import * as v from 'valibot'
import { computed } from 'vue'

import { useInvoke } from '../invoke/use-invoke'
import { DesignLocation } from '../router/design-location'
import { showWorkspace } from './show-workspace'
import type { UseWorkspaceResult, WorkspaceTab } from './types'

const TABS: readonly WorkspaceTab[] = workspaceSchema.options.map((workspace) => ({
  value: workspace,
  label: showWorkspace[workspace].label,
  hotkey: showWorkspace[workspace].hotkeys[0],
}))

export function useWorkspace(): UseWorkspaceResult {
  const location = useService(DesignLocation)
  const { invoke } = useInvoke()
  // Setting it switches through the workspace's own entry, as its key does.
  const workspace = computed({
    get: () => location.workspace.getOrUndefined(),
    set: (value: string | undefined) => {
      if (v.is(workspaceSchema, value)) void invoke(showWorkspace[value])
    },
  })
  return { workspace, tabs: TABS }
}
