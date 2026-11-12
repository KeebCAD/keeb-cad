import type { Module } from '@keeb-cad/di'

import { Flows } from './flows/flows'
import { Invoke } from './invoke/invoke'
import { FocusNextLandmark } from './landmarks/focus-next-landmark'
import { FocusPreviousLandmark } from './landmarks/focus-previous-landmark'
import { Landmarks } from './landmarks/landmarks'
import { DesignLocation } from './router/design-location'
import { DeleteSelection } from './selection/delete-selection'
import { DuplicateSelection } from './selection/duplicate-selection'
import { Selection } from './selection/selection'
import { ShortcutRegistry } from './shortcuts/shortcut-registry'
import { CloseSlideOut } from './slide-out/close-slide-out'
import { OpenTree } from './slide-out/open-tree'
import { SlideOut } from './slide-out/slide-out'
import { registerUiAction } from './ui-actions/register-ui-action'
import { CanvasCursor } from './viewport/canvas-cursor'
import { CanvasItems } from './viewport/canvas-items'
import { FitViewport } from './viewport/fit-viewport'
import { Viewport } from './viewport/viewport'
import { ShowCase } from './workspace/case/show-case'
import { ShowFirmware } from './workspace/firmware/show-firmware'
import { ShowLayout } from './workspace/layout/show-layout'
import { SwitchGrace } from './workspace/layout/switch-grace'
import { ShowOutline } from './workspace/outline/show-outline'
import { ShowPcb } from './workspace/pcb/show-pcb'

export const editorModule: Module = {
  register(container) {
    container.register(Invoke).useClass(Invoke)
    container.register(ShortcutRegistry).useClass(ShortcutRegistry).eager()
    container.register(DesignLocation).useClass(DesignLocation)
    container.register(Landmarks).useClass(Landmarks)
    container.register(SlideOut).useClass(SlideOut)
    container.register(Selection).useClass(Selection)
    container.register(Flows).useClass(Flows)
    container.register(CanvasItems).useClass(CanvasItems)
    container.register(Viewport).useClass(Viewport)
    container.register(CanvasCursor).useClass(CanvasCursor)
    container.register(SwitchGrace).useClass(SwitchGrace)
    registerUiAction(container, ShowLayout)
    registerUiAction(container, ShowOutline)
    registerUiAction(container, ShowPcb)
    registerUiAction(container, ShowCase)
    registerUiAction(container, ShowFirmware)
    registerUiAction(container, FocusNextLandmark)
    registerUiAction(container, FocusPreviousLandmark)
    registerUiAction(container, OpenTree)
    registerUiAction(container, CloseSlideOut)
    registerUiAction(container, FitViewport)
    registerUiAction(container, DeleteSelection)
    registerUiAction(container, DuplicateSelection)
  },
}
