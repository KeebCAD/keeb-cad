import { layoutCommandsModule, modelWorkerActionsModule } from '@keeb-cad/commands'
import { DesignStore, designModule } from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { expectOk } from '@keeb-cad/result/testing'
import { ModelWorkerLifecycle, workersModule } from '@keeb-cad/workers'
import { FakeWorker, RecordingModelWorkerLifecycle } from '@keeb-cad/workers/testing'
import { onTestFinished } from 'vitest'
import { type App, effectScope } from 'vue'

import { editorModule } from '../editor-module'
import { Invoke } from '../invoke/invoke'
import { mountEditor } from '../mount-editor'
import { resetColorScheme } from './color-scheme'
import type {
  MountedShell,
  RecordingShell,
  RecordingShellArrangement,
  ShellArrangement,
  SpawningShell,
  SpawningShellArrangement,
} from './types'

export async function mountShell(arrangement: RecordingShellArrangement): Promise<RecordingShell>
export async function mountShell(arrangement: SpawningShellArrangement): Promise<SpawningShell>
export async function mountShell(arrangement: ShellArrangement): Promise<MountedShell>
export async function mountShell({
  path,
  design,
  recordFocus = false,
  spawn = false,
  modules = [],
}: ShellArrangement): Promise<MountedShell | RecordingShell | SpawningShell> {
  // replaceState fires no popstate, which Firefox would deliver after the router listens.
  history.replaceState(null, '', `#${path}`)
  const container = new Container()
    .addModule(designModule)
    .addModule(workersModule)
    .addModule(modelWorkerActionsModule)
    .addModule(layoutCommandsModule)
    .addModule(editorModule)
  for (const module of modules) container.addModule(module)
  if (recordFocus) {
    container.register(RecordingModelWorkerLifecycle).useClass(RecordingModelWorkerLifecycle)
    container
      .override(ModelWorkerLifecycle)
      .useFactory(() => container.resolve(RecordingModelWorkerLifecycle))
  }
  await container.autoLoad()
  if (design !== undefined) {
    expectOk(container.resolve(DesignStore).replaceDesign({ design, unreadable: [] }))
  }
  const spawned: FakeWorker[] = []
  if (spawn) {
    container.resolve(ModelWorkerLifecycle).start(() => {
      const worker = new FakeWorker()
      spawned.push(worker)
      return worker
    })
  }
  // styles.css gives #app the page's full height, as in the app.
  const root = document.createElement('div')
  root.id = 'app'
  document.body.append(root)
  const scope = effectScope()
  onTestFinished(async () => {
    ;(root as HTMLElement & { __vue_app__?: App }).__vue_app__?.unmount()
    scope.stop()
    root.remove()
    history.replaceState(null, '', location.pathname + location.search)
    await container.dispose()
    // After the unmount: a mounted useColorMode would write data-theme back on the scheme change.
    await resetColorScheme()
  })
  const router = scope.run(() => mountEditor('#app', container.resolve(InjectorToken)))
  if (router === undefined) throw new Error('The scope ran nothing.')
  await router.isReady()
  const shell = {
    router,
    invoke: container.resolve(Invoke),
    injector: container.resolve(InjectorToken),
  }
  if (recordFocus) {
    return { ...shell, lifecycle: container.resolve(RecordingModelWorkerLifecycle) }
  }
  return spawn ? { ...shell, store: container.resolve(DesignStore), spawned } : shell
}
