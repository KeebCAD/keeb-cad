import { test as base } from '@playwright/test'

import { buildCorneyBundle } from './build-corney-bundle'
import type { CorneyBundle } from './types'

export const test = base.extend<{ corney: CorneyBundle }>({
  corney: async ({}, use, testInfo) => {
    await use(await buildCorneyBundle(`node_modules/.vite-e2e/${testInfo.project.name}`))
  },
})
