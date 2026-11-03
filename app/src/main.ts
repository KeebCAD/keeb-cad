import { mountEditor } from '@keeb-cad/editor'

import { createMainContainer } from './main-container'

await createMainContainer()
mountEditor('#app')
