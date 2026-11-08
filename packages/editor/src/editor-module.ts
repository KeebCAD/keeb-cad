import type { Module } from '@keeb-cad/di'

import { Invoke } from './invoke/invoke'
import { FocusNextLandmark } from './landmarks/focus-next-landmark'
import { FocusPreviousLandmark } from './landmarks/focus-previous-landmark'
import { Landmarks } from './landmarks/landmarks'
import { DesignLocation } from './router/design-location'
import { ShortcutRegistry } from './shortcuts/shortcut-registry'
import { CloseSlideOut } from './slide-out/close-slide-out'
import { OpenTree } from './slide-out/open-tree'
import { SlideOut } from './slide-out/slide-out'
import { registerUiAction } from './ui-actions/register-ui-action'
import { ShowCase } from './workspace/case/show-case'
import { ShowFirmware } from './workspace/firmware/show-firmware'
import { ShowLayout } from './workspace/layout/show-layout'
import { ShowOutline } from './workspace/outline/show-outline'
import { ShowPcb } from './workspace/pcb/show-pcb'

export const editorModule: Module = {
  register(container) {
    container.register(Invoke).useClass(Invoke)
    container.register(ShortcutRegistry).useClass(ShortcutRegistry).eager()
    container.register(DesignLocation).useClass(DesignLocation)
    container.register(Landmarks).useClass(Landmarks)
    container.register(SlideOut).useClass(SlideOut)
    registerUiAction(container, ShowLayout)
    registerUiAction(container, ShowOutline)
    registerUiAction(container, ShowPcb)
    registerUiAction(container, ShowCase)
    registerUiAction(container, ShowFirmware)
    registerUiAction(container, FocusNextLandmark)
    registerUiAction(container, FocusPreviousLandmark)
    registerUiAction(container, OpenTree)
    registerUiAction(container, CloseSlideOut)
  },
}
