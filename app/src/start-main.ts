import { Container } from '@keeb-cad/di'
import { mountEditor } from '@keeb-cad/editor'

import { mainModules } from './main-modules'

const container = new Container()
for (const module of mainModules) container.addModule(module)
await container.autoLoad()
mountEditor('#app')
