import { Container } from '@keeb-cad/di'

import { Launch } from './launch/launch'
import { mainModules } from './main-modules'

const container = new Container()
for (const module of mainModules) container.addModule(module)
await container.autoLoad()
await container
  .resolve(Launch)
  .run('#app', () => new Worker(new URL('model.worker.ts', import.meta.url), { type: 'module' }))
