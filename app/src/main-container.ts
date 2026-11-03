import { designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'

export async function createMainContainer(): Promise<Container> {
  const container = new Container().addModule(designModule)
  await container.autoLoad()
  return container
}
