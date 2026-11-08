import type { Workspace } from '@keeb-cad/schema'

import { ShowCase } from './case/show-case'
import { ShowFirmware } from './firmware/show-firmware'
import { ShowLayout } from './layout/show-layout'
import { ShowOutline } from './outline/show-outline'
import { ShowPcb } from './pcb/show-pcb'
import type { ShowWorkspaceHandle } from './types'

export const showWorkspace: Readonly<Record<Workspace, ShowWorkspaceHandle>> = {
  layout: ShowLayout,
  outline: ShowOutline,
  pcb: ShowPcb,
  case: ShowCase,
  firmware: ShowFirmware,
}
