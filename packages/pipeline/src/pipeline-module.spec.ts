import { blueprintWorkerModule } from '@keeb-cad/blueprint/worker'
import { designWorkerModule } from '@keeb-cad/design/worker'
import { Container } from '@keeb-cad/di'
import { Dispatcher } from '@keeb-cad/messaging'
import { describe, expect, it } from 'vitest'

import { pipelineModule } from './pipeline-module'

describe('pipelineModule', () => {
  it('gives the model worker one dispatcher', async () => {
    const container = new Container()
      .addModule(designWorkerModule)
      .addModule(blueprintWorkerModule)
      .addModule(pipelineModule)
    await container.autoLoad()

    expect(container.resolve(Dispatcher)).toBe(container.resolve(Dispatcher))
  })
})
