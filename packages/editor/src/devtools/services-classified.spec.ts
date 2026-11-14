import { designModule } from '@keeb-cad/design'
import { Container, type MultiToken, type TokenLike } from '@keeb-cad/di'
import { workersModule } from '@keeb-cad/workers'
import { describe, expect, it, onTestFinished } from 'vitest'

import { editorModule } from '../editor-module'
import { Flows } from '../flows/flows'
import { HoveredGroup } from '../group-border/hovered-group'
import { Invoke } from '../invoke/invoke'
import { Landmarks } from '../landmarks/landmarks'
import { DesignLocation } from '../router/design-location'
import { Selection } from '../selection/selection'
import { ShortcutRegistry } from '../shortcuts/shortcut-registry'
import { SlideOut } from '../slide-out/slide-out'
import { CanvasCursor } from '../viewport/canvas-cursor'
import { CanvasItems } from '../viewport/canvas-items'
import { Viewport } from '../viewport/viewport'
import { SwitchGrace } from '../workspace/layout/switch-grace'
import { devtoolsModule } from './devtools-module'
import { devtoolsPluginId } from './plugin-id'
import { inspectables } from './tokens'

type Classification = { shownAs: string } | { notShown: string }

const designStoreId = `${devtoolsPluginId}.design-store`

const classified: readonly (readonly [new () => unknown, Classification])[] = [
  [Invoke, { notShown: 'its calls are the invocations timeline layer' }],
  [ShortcutRegistry, { notShown: 'its content is declared by handles, nothing changes it live' }],
  [Landmarks, { notShown: 'focus order, read off the DOM by the browser devtools' }],
  [DesignLocation, { shownAs: `${devtoolsPluginId}.design-location` }],
  [SlideOut, { shownAs: `${devtoolsPluginId}.slide-out` }],
  [Selection, { shownAs: `${devtoolsPluginId}.selection` }],
  [Viewport, { shownAs: `${devtoolsPluginId}.viewport` }],
  [CanvasItems, { notShown: 'DOM elements the canvas registers, read off the DOM like Landmarks' }],
  [CanvasCursor, { notShown: 'the pointer, shown live in the status strip' }],
  [SwitchGrace, { notShown: 'grayed is derived from a timer and the lifecycle, like Landmarks' }],
  [HoveredGroup, { notShown: 'the pointer, shown live by the borders it strokes on the canvas' }],
  [Flows, { shownAs: `${devtoolsPluginId}.flows` }],
]

// The base constructor registers its builtins before this class's fields exist, so `recorded`
// starts undefined and each test switches recording on after construction.
class RecordingContainer extends Container {
  recorded: unknown[] | undefined

  override register<T>(token: TokenLike<T> | MultiToken<T>) {
    this.recorded?.push(token)
    return super.register<T>(token)
  }
}

function byText(a: string, b: string): number {
  return a.localeCompare(b)
}

function registeredClassNames(): string[] {
  const container = new RecordingContainer()
  container.recorded = []
  editorModule.register(container)
  return (
    container.recorded
      .filter((token): token is new () => unknown => typeof token === 'function')
      // Handles, not state: a UiAction's or a flow's class is what a caller names.
      .filter(
        (token) =>
          !['ui-action', 'flow'].includes((token as unknown as { kind?: string }).kind ?? ''),
      )
      .map((token) => token.name)
      .toSorted(byText)
  )
}

describe('the services shown in the devtools', () => {
  it('classifies every class editorModule registers', () => {
    const table = classified.map(([service]) => service.name).toSorted(byText)

    expect(registeredClassNames()).toEqual(table)
  })

  it("registers exactly the table's shown ids plus the design store's", async () => {
    const container = new Container()
      .addModule(designModule)
      .addModule(workersModule)
      .addModule(editorModule)
      .addModule(devtoolsModule)
    onTestFinished(() => container.dispose())
    const shown = classified.flatMap(([, entry]) => ('shownAs' in entry ? [entry.shownAs] : []))

    const registered = container.resolve(inspectables).map(({ id }) => id)

    expect(registered.toSorted(byText)).toEqual([...shown, designStoreId].toSorted(byText))
  })
})
