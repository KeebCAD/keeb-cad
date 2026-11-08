import UiButton from '../src/button/UiButton.vue'
import UiIcon from '../src/icon/UiIcon.vue'
import UiKbd from '../src/kbd/UiKbd.vue'
import UiRailButton from '../src/rail-button/UiRailButton.vue'
import UiTabs from '../src/tabs/UiTabs.vue'
import UiTooltip from '../src/tooltip/UiTooltip.vue'
import { buttonStates } from './states/button-states'
import { iconStates } from './states/icon-states'
import { kbdStates } from './states/kbd-states'
import { railButtonStates } from './states/rail-button-states'
import { tabsStates } from './states/tabs-states'
import { tooltipStates } from './states/tooltip-states'
import type { Widget } from './types'

export const widgets: readonly Widget[] = [
  { title: 'Button', component: UiButton, states: buttonStates },
  { title: 'Tooltip', component: UiTooltip, states: tooltipStates },
  { title: 'Kbd', component: UiKbd, states: kbdStates },
  { title: 'Tabs', component: UiTabs, states: tabsStates },
  { title: 'Icon', component: UiIcon, states: iconStates },
  { title: 'Rail button', component: UiRailButton, states: railButtonStates },
]
