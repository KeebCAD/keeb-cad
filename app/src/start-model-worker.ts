import { designWorkerModule } from '@keeb-cad/design/worker'
import { Container } from '@keeb-cad/di'
import { Pipeline, pipelineModule } from '@keeb-cad/pipeline'

const container = new Container().addModule(designWorkerModule).addModule(pipelineModule)
await container.autoLoad()
container.resolve(Pipeline).listen(globalThis)
