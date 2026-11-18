import type { Module } from '@keeb-cad/di'

import { AddGroupFlow } from './add-flow/add-group-flow'
import { AddSlotFlow } from './add-flow/add-slot-flow'
import { StartAddChainGroup } from './add-flow/start-add-chain-group'
import { StartAddFreeGroup } from './add-flow/start-add-free-group'
import { StartAddSlot } from './add-flow/start-add-slot'
import { FieldSession } from './expression-field/field-session'
import { Flows } from './flows/flows'
import { registerFlow } from './flows/register-flow'
import { HoveredNode } from './hover/hovered-node'
import { Invoke } from './invoke/invoke'
import { FocusNextLandmark } from './landmarks/focus-next-landmark'
import { FocusPreviousLandmark } from './landmarks/focus-previous-landmark'
import { Landmarks } from './landmarks/landmarks'
import { AddParameterFlow } from './parameters/add-parameter-flow'
import { DeleteParameterRefusal } from './parameters/delete-parameter-refusal'
import { FocusedParameter } from './parameters/focused-parameter'
import { RenameParameterFlow } from './parameters/rename-parameter-flow'
import { StartAddParameter } from './parameters/start-add-parameter'
import { StartRenameParameter } from './parameters/start-rename-parameter'
import { DesignLocation } from './router/design-location'
import { DeleteSelection } from './selection/delete-selection'
import { DuplicateSelection } from './selection/duplicate-selection'
import { Selection } from './selection/selection'
import { ShortcutRegistry } from './shortcuts/shortcut-registry'
import { SlideOut } from './slide-out/slide-out'
import { ShowSlideOutTab } from './slide-out/show-slide-out-tab'
import { ToggleSlideOut } from './slide-out/toggle-slide-out'
import { ToggleSlideOutTab } from './slide-out/toggle-slide-out-tab'
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
    container.register(HoveredNode).useClass(HoveredNode)
    container.register(FieldSession).useClass(FieldSession)
    container.register(FocusedParameter).useClass(FocusedParameter)
    container.register(DeleteParameterRefusal).useClass(DeleteParameterRefusal)
    registerUiAction(container, ShowLayout)
    registerUiAction(container, ShowOutline)
    registerUiAction(container, ShowPcb)
    registerUiAction(container, ShowCase)
    registerUiAction(container, ShowFirmware)
    registerUiAction(container, FocusNextLandmark)
    registerUiAction(container, FocusPreviousLandmark)
    registerUiAction(container, ToggleSlideOut)
    registerUiAction(container, ToggleSlideOutTab)
    registerUiAction(container, ShowSlideOutTab)
    registerUiAction(container, FitViewport)
    registerUiAction(container, DeleteSelection)
    registerUiAction(container, DuplicateSelection)
    registerFlow(container, AddGroupFlow)
    registerFlow(container, AddSlotFlow)
    registerUiAction(container, StartAddChainGroup)
    registerUiAction(container, StartAddFreeGroup)
    registerUiAction(container, StartAddSlot)
    registerFlow(container, AddParameterFlow)
    registerFlow(container, RenameParameterFlow)
    registerUiAction(container, StartAddParameter)
    registerUiAction(container, StartRenameParameter)
  },
}
