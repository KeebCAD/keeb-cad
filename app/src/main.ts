// The main thread's entry: builds the main container, then mounts the editor (AD-25).
import { designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { mountEditor } from '@keeb-cad/editor'

const container = new Container().addModules([designModule])
await container.autoLoad()

mountEditor('#app')
