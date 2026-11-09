import { blueprintWorkerModule, LaneRunner } from '@keeb-cad/blueprint/worker'
import { DesignMirror, designWorkerModule } from '@keeb-cad/design/worker'
import { Container } from '@keeb-cad/di'
import { libraryData } from '@keeb-cad/library/worker'
import { createDerivations } from '@keeb-cad/model/worker'
import { Pipeline, pipelineModule } from '@keeb-cad/pipeline'

const container = new Container()
  .addModule(designWorkerModule)
  .addModule(blueprintWorkerModule)
  .addModule(pipelineModule)
await container.autoLoad()
const runner = container.resolve(LaneRunner)
runner.useLibrary(libraryData)
const derivations = createDerivations(container.resolve(DesignMirror), libraryData, runner)
container.resolve(Pipeline).listen(globalThis, derivations)
