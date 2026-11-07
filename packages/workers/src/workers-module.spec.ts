import { designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { Dispatcher } from '@keeb-cad/messaging'
import { describe, expect, it } from 'vitest'

import { workersModule } from './workers-module'

describe('workersModule', () => {
  it('gives main one dispatcher', async () => {
    const container = new Container().addModule(designModule).addModule(workersModule)
    await container.autoLoad()

    expect(container.resolve(Dispatcher)).toBe(container.resolve(Dispatcher))
  })
})
