import { DesignStore } from '@keeb-cad/design'
import { inject } from '@keeb-cad/di'
import { subtreeIdsOf } from '@keeb-cad/model/main'
import type { Id } from '@keeb-cad/schema'
import { useStorage, watchThrottled } from '@vueuse/core'
import { effectScope, shallowRef, watch } from 'vue'

import { CanvasItems } from './canvas-items'
import { clampZoom } from './clamp-zoom'
import { panBy } from './pan-by'
import type { Bounds, CanvasSize, Point, ViewportEdit, ViewportValue } from './types'
import { viewportForBounds } from './viewport-for-bounds'
import { fitPaddingPx, viewportWriteIntervalMs } from './viewport-limits'
import { viewportSerializer } from './viewport-serializer'
import { viewportStorageKey } from './viewport-storage-key'
import { zoomAt } from './zoom-at'

export class Viewport implements Disposable {
  static readonly initial: ViewportValue = { centre: { x: 0, y: 0 }, zoom: 4 }

  constructor() {
    this.#scope.run(() => {
      // Flushed synchronously, so a pending write lands under its own design's key before the
      // key moves to the next design.
      this.#stored = useStorage<ViewportValue | null>(
        () => this.#key.value ?? '',
        null,
        undefined,
        {
          serializer: viewportSerializer,
          writeDefaults: false,
          flush: 'sync',
        },
      )
      watch(
        () => this.#store.current.map(({ design }) => design.meta.id).getOrUndefined(),
        (designId) => {
          this.#open(designId === undefined ? undefined : viewportStorageKey(designId))
        },
        { immediate: true, flush: 'sync' },
      )
      watchThrottled(
        this.#edited,
        (edit) => {
          this.#write(edit)
        },
        { throttle: viewportWriteIntervalMs, leading: true, trailing: true },
      )
    })
  }

  get centre(): Point {
    return this.#value.value.centre
  }

  get zoom(): number {
    return this.#value.value.zoom
  }

  get value(): ViewportValue {
    return this.#value.value
  }

  setCentre(centre: Point): void {
    this.#set({ ...this.#value.value, centre: { ...centre } })
  }

  setZoom(zoom: number): void {
    this.#set({ ...this.#value.value, zoom: clampZoom(zoom) })
  }

  zoomAt(screenPoint: Point, factor: number, size: CanvasSize): void {
    this.#set(zoomAt(this.#value.value, screenPoint, factor, size))
  }

  panBy(screenDelta: Point): void {
    this.#set(panBy(this.#value.value, screenDelta))
  }

  // The opening fit: only while nothing is stored for the open design. A fit that can't run
  // writes nothing, so the next call may fit.
  fitOnce(bounds: Bounds, size: CanvasSize): void {
    if (this.#hasValue()) return
    this.#fit(bounds, size)
  }

  fitNodes(ids: readonly Id[]): void {
    const expanded = this.#store.current
      .map(({ design }) => subtreeIdsOf(design.layout, ids))
      .getOr([])
    const bounds = this.#items.bounds(expanded)
    const drawn = (bounds.isSome() ? bounds : this.#items.allBounds()).getOrUndefined()
    const size = this.#items.size().getOrUndefined()
    if (drawn !== undefined && size !== undefined) this.#fit(drawn, size)
  }

  [Symbol.dispose](): void {
    this.#write(this.#edited.value)
    this.#scope.stop()
  }

  readonly #store = inject(DesignStore)
  readonly #items = inject(CanvasItems)
  readonly #value = shallowRef<ViewportValue>(Viewport.initial)
  // The storage key of the open design; none while no design is open, when nothing is written.
  readonly #key = shallowRef<string | undefined>(undefined)
  // The latest edit not yet known to be written, for the design it was made on.
  readonly #edited = shallowRef<ViewportEdit | undefined>(undefined)
  #stored = shallowRef<ViewportValue | null>(null)
  // Detached: the service is first resolved inside some component's setup, and a scope of that
  // component's would stop the storage and the writes when it unmounts.
  readonly #scope = effectScope(true)

  #open(key: string | undefined): void {
    this.#write(this.#edited.value)
    this.#edited.value = undefined
    this.#key.value = key
    this.#value.value = (key === undefined ? null : this.#stored.value) ?? Viewport.initial
  }

  #hasValue(): boolean {
    return this.#stored.value !== null || this.#edited.value !== undefined
  }

  #fit(bounds: Bounds, size: CanvasSize): void {
    const fitted = viewportForBounds(bounds, size, fitPaddingPx)
    if (fitted.isSome()) this.#set({ ...fitted.value, zoom: clampZoom(fitted.value.zoom) })
  }

  #set(value: ViewportValue): void {
    this.#value.value = value
    const key = this.#key.value
    if (key !== undefined) this.#edited.value = { key, value }
  }

  // An edit made on another design was written when that design closed.
  #write(edit: ViewportEdit | undefined): void {
    if (edit === undefined || edit.key !== this.#key.value) return
    this.#stored.value = edit.value
  }
}
