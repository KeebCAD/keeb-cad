import { blueprintWorkerModule, LaneRunner } from '@keeb-cad/blueprint/worker'
import { designWorkerModule } from '@keeb-cad/design/worker'
import { Container } from '@keeb-cad/di'
import { libraryData } from '@keeb-cad/library/worker'
import { Pipeline, pipelineModule } from '@keeb-cad/pipeline'

const container = new Container()
  .addModule(designWorkerModule)
  .addModule(blueprintWorkerModule)
  .addModule(pipelineModule)
await container.autoLoad()
container.resolve(LaneRunner).useLibrary(libraryData)
container.resolve(Pipeline).listen(globalThis, () => [])
