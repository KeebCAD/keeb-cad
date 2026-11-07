import { createRouter, createWebHashHistory } from 'vue-router'

import type { DesignLocation } from '../types'
import DesignCanvas from '../views/DesignCanvas.vue'
import { resolveWorkspace } from './resolve-workspace'

export function createEditorRouter(): DesignLocation {
  const router = createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/', component: DesignCanvas },
      { path: '/design/:id/:workspace?', name: 'design', component: DesignCanvas },
    ],
  })
  router.beforeEach(resolveWorkspace)
  return router
}
