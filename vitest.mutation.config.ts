import { defineConfig, type TestProjectInlineConfiguration } from 'vitest/config'

import workspace from './vitest.config'

// Stryker cannot instrument browser mode, so a mutation run takes only the inline Node projects;
// tooling's specs check the repository, not the code Stryker mutates.
const mutationProject = (project: unknown): project is TestProjectInlineConfiguration =>
  typeof project === 'object' &&
  project !== null &&
  !(project instanceof Promise) &&
  (project as TestProjectInlineConfiguration).test?.name !== 'tooling'

export default defineConfig({
  test: {
    ...workspace.test,
    // Each Stryker worker would draw its own seed, so an order-sensitive test could kill a mutant
    // in one worker and not in another.
    sequence: { shuffle: false },
    projects: workspace.test?.projects?.filter(mutationProject),
  },
})
