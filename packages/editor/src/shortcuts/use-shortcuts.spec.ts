import {
  type Command,
  DesignStore,
  designModule,
  registerCommand,
  type Writable,
} from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { expectOk } from '@keeb-cad/result/testing'
import type { Design } from '@keeb-cad/schema'
import { aDesign, aMeta } from '@keeb-cad/schema/testing'
import { workersModule } from '@keeb-cad/workers'
import * as v from 'valibot'
import { afterEach, describe, expect, it, onTestFinished } from 'vitest'
import { effectScope, type App } from 'vue'

import { editorModule } from '../editor-module'
import { mountEditor } from '../mount-editor'
import { press } from '../testing/press'

const expectedPressedName = 'Pressed'

const renameDesignInputSchema = v.object({
  name: v.optional(v.string(), expectedPressedName),
})
type RenameDesignInput = v.InferOutput<typeof renameDesignInputSchema>

class RenameDesign implements Command<RenameDesignInput> {
  static readonly kind = 'command'
  static readonly id = 'meta.renameDesign'
  static readonly label = 'Rename design'
  static readonly input = renameDesignInputSchema
  static readonly hotkeys = ['A']

  available(): boolean {
    return true
  }

  apply(draft: Writable<Design>, input: RenameDesignInput): void {
    draft.meta.name = input.name
  }
}

afterEach(() => {
  history.replaceState(null, '', location.pathname + location.search)
})

async function arrange(design: Design) {
  const container = new Container()
    .addModule(designModule)
    .addModule(workersModule)
    .addModule(editorModule)
  registerCommand(container, RenameDesign)
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  expectOk(store.replaceDesign({ design, unreadable: [] }))
  const root = document.createElement('div')
  root.id = 'editor-root'
  document.body.append(root)
  const scope = effectScope()
  const unmount = () => (root as HTMLElement & { __vue_app__?: App }).__vue_app__?.unmount()
  onTestFinished(async () => {
    unmount()
    scope.stop()
    root.remove()
    await container.dispose()
  })
  const injector = container.resolve(InjectorToken)
  return {
    store,
    mount: () => scope.run(() => mountEditor('#editor-root', injector)),
    unmount,
  }
}

describe('useShortcuts', () => {
  it('runs a hotkey while the editor is mounted', async () => {
    const { store, mount } = await arrange(aDesign())
    mount()

    press('A')

    expect(store.current.getOrUndefined()).toMatchObject({
      design: { meta: { name: expectedPressedName } },
    })
  })

  it('runs no hotkey once the editor is unmounted', async () => {
    const design = aDesign({ meta: aMeta({ name: 'Corne' }) })
    const { store, mount, unmount } = await arrange(design)
    mount()
    unmount()

    press('A')

    expect(store.current.getOrUndefined()).toMatchObject({ design })
  })
})
