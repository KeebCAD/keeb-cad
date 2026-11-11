import {
  type Command,
  DesignStore,
  designModule,
  registerCommand,
  type Writable,
} from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { Option, Result } from '@keeb-cad/result'
import { expectOk } from '@keeb-cad/result/testing'
import type { Design, Rejection } from '@keeb-cad/schema'
import { aDesign } from '@keeb-cad/schema/testing'
import * as v from 'valibot'
import { describe, expect, it, onTestFinished } from 'vitest'
import { render } from 'vitest-browser-vue'
import { type App, defineComponent, h } from 'vue'

import { editorModule } from '../editor-module'
import { useInvoke } from './use-invoke'

const nameInputSchema = v.object({ name: v.pipe(v.string(), v.minLength(1)) })
type NameInput = v.InferOutput<typeof nameInputSchema>

class RenameDesign implements Command<NameInput> {
  static readonly kind = 'command'
  static readonly id = 'meta.renameDesign'
  static readonly label = 'Rename design'
  static readonly input = nameInputSchema

  available(): Result<void, Rejection> {
    return Result.ok()
  }

  apply(draft: Writable<Design>, input: NameInput): void {
    draft.meta.name = input.name
  }
}

const RenameButton = defineComponent({
  setup() {
    const { invoke } = useInvoke()
    return () =>
      h(
        'button',
        { type: 'button', onClick: () => void invoke(RenameDesign, { name: 'Lily58' }) },
        'Rename',
      )
  },
})

async function arrange(design: Design) {
  const container = new Container().addModule(designModule).addModule(editorModule)
  registerCommand(container, RenameDesign)
  onTestFinished(() => container.dispose())
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  expectOk(store.replaceDesign({ design, unreadable: [] }))
  const injector = container.resolve(InjectorToken)
  const screen = await render(RenameButton, {
    global: { plugins: [{ install: (app: App) => provideInjectorOnApp(app, injector) }] },
  })
  return { screen, store }
}

describe('useInvoke', () => {
  it("runs a command with a component's input on click", async () => {
    const { screen, store } = await arrange(aDesign())

    await screen.getByRole('button', { name: 'Rename' }).click()

    expect(store.current.map((committed) => committed.design.meta.name)).toEqual(
      Option.some('Lily58'),
    )
  })
})
