import { designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { mountEditor } from '@keeb-cad/editor'

const container = new Container().addModule(designModule)
await container.autoLoad()
mountEditor('#app')
