import { workspaceSchema } from '@keeb-cad/schema'
import {
  createRouter,
  createWebHashHistory,
  type RouteLocation,
  type RouteLocationRaw,
  type Router,
} from 'vue-router'

import EditorShell from '../shell/EditorShell.vue'
import CaseCanvas from '../workspace/case/CaseCanvas.vue'
import CaseInspector from '../workspace/case/CaseInspector.vue'
import FirmwareCanvas from '../workspace/firmware/FirmwareCanvas.vue'
import FirmwareInspector from '../workspace/firmware/FirmwareInspector.vue'
import LayoutCanvas from '../workspace/layout/LayoutCanvas.vue'
import LayoutInspector from '../workspace/layout/LayoutInspector.vue'
import OutlineCanvas from '../workspace/outline/OutlineCanvas.vue'
import OutlineInspector from '../workspace/outline/OutlineInspector.vue'
import PcbCanvas from '../workspace/pcb/PcbCanvas.vue'
import PcbInspector from '../workspace/pcb/PcbInspector.vue'
import NoDesign from './NoDesign.vue'

const views = {
  layout: { default: LayoutCanvas, inspector: LayoutInspector },
  outline: { default: OutlineCanvas, inspector: OutlineInspector },
  pcb: { default: PcbCanvas, inspector: PcbInspector },
  case: { default: CaseCanvas, inspector: CaseInspector },
  firmware: { default: FirmwareCanvas, inspector: FirmwareInspector },
}

export function createEditorRouter(): Router {
  return createRouter({
    history: createWebHashHistory(),
    // A workspace segment in another case is unknown, so it goes to layout too.
    sensitive: true,
    routes: [
      { path: '/', component: NoDesign },
      {
        path: '/design/:id',
        component: EditorShell,
        children: [
          { path: '', redirect: toLayout },
          ...workspaceSchema.options.map((workspace) => ({
            path: workspace,
            name: workspace,
            components: views[workspace],
          })),
          { path: ':unknown(.*)*', redirect: toLayout },
        ],
      },
    ],
  })
}

function toLayout(to: RouteLocation): RouteLocationRaw {
  return { name: 'layout', params: { id: to.params.id } }
}
