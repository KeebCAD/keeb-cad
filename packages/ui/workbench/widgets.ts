import UiButton from '../src/button/UiButton.vue'
import UiIcon from '../src/icon/UiIcon.vue'
import UiKbd from '../src/kbd/UiKbd.vue'
import UiRailButton from '../src/rail-button/UiRailButton.vue'
import UiSegmentedControl from '../src/segmented-control/UiSegmentedControl.vue'
import UiSeverityCount from '../src/severity-count/UiSeverityCount.vue'
import UiTabs from '../src/tabs/UiTabs.vue'
import UiTextField from '../src/text-field/UiTextField.vue'
import UiTooltip from '../src/tooltip/UiTooltip.vue'
import UiTree from '../src/tree/UiTree.vue'
import CanvasToggleFrame from './CanvasToggleFrame.vue'
import DialogHost from './DialogHost.vue'
import { buttonStates } from './states/button-states'
import { canvasToggleStates } from './states/canvas-toggle-states'
import { dialogStates } from './states/dialog-states'
import { iconStates } from './states/icon-states'
import { kbdStates } from './states/kbd-states'
import { railButtonStates } from './states/rail-button-states'
import { segmentedControlStates } from './states/segmented-control-states'
import { severityCountStates } from './states/severity-count-states'
import { tabsStates } from './states/tabs-states'
import { textFieldStates } from './states/text-field-states'
import { tooltipStates } from './states/tooltip-states'
import { treeStates } from './states/tree-states'
import type { Widget } from './types'

export const widgets: readonly Widget[] = [
  { title: 'Button', component: UiButton, states: buttonStates },
  { title: 'Tooltip', component: UiTooltip, states: tooltipStates },
  { title: 'Kbd', component: UiKbd, states: kbdStates },
  { title: 'Tabs', component: UiTabs, states: tabsStates },
  { title: 'Icon', component: UiIcon, states: iconStates },
  { title: 'Rail button', component: UiRailButton, states: railButtonStates },
  { title: 'Severity count', component: UiSeverityCount, states: severityCountStates },
  { title: 'Canvas toggle', component: CanvasToggleFrame, states: canvasToggleStates },
  { title: 'Tree', component: UiTree, states: treeStates },
  { title: 'Dialog', component: DialogHost, states: dialogStates },
  { title: 'Text field', component: UiTextField, states: textFieldStates },
  { title: 'Segmented control', component: UiSegmentedControl, states: segmentedControlStates },
]
