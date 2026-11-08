import { designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { Option } from '@keeb-cad/result'
import { ModelWorkerLifecycle, workersModule } from '@keeb-cad/workers'
import { RecordingModelWorkerLifecycle } from '@keeb-cad/workers/testing'
import { describe, expect, it, onTestFinished } from 'vitest'

import { editorModule } from '../editor-module'
import { DesignLocation } from './design-location'

async function arrange(path: string) {
  const container = new Container()
    .addModule(designModule)
    .addModule(workersModule)
    .addModule(editorModule)
  container.register(RecordingModelWorkerLifecycle).useClass(RecordingModelWorkerLifecycle)
  container
    .override(ModelWorkerLifecycle)
    .useFactory(() => container.resolve(RecordingModelWorkerLifecycle))
  onTestFinished(async () => {
    await container.dispose()
    history.replaceState(null, '', location.pathname + location.search)
  })
  await container.autoLoad()
  const designLocation = container.resolve(DesignLocation)
  await designLocation.router.push(path)
  return { designLocation, lifecycle: container.resolve(RecordingModelWorkerLifecycle) }
}

describe('DesignLocation', () => {
  it('focuses the worker on nothing for the first design route', async () => {
    const { designLocation, lifecycle } = await arrange('/')

    await designLocation.router.push('/design/corne/layout')

    expect(lifecycle.focused).toEqual([])
  })

  it('focuses the worker on the new workspace of a design route', async () => {
    const { designLocation, lifecycle } = await arrange('/design/corne/layout')

    await designLocation.openWorkspace('pcb')

    expect({
      path: designLocation.router.currentRoute.value.fullPath,
      focused: lifecycle.focused,
    }).toEqual({
      path: '/design/corne/pcb',
      focused: ['pcb'],
    })
  })

  it.each([
    ['none off a design route', '/', Option.none()],
    ['the matched one on a design route', '/design/corne/case', Option.some('case')],
  ])('holds %s as its workspace', async (_role, path, expected) => {
    const { designLocation } = await arrange(path)

    expect(designLocation.workspace).toEqual(expected)
  })
})
