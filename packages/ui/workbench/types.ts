import type { Component } from 'vue'

import type { WidgetState } from './states/types'

export type Widget = { title: string; component: Component; states: readonly WidgetState[] }

export type ThemeName = 'dark' | 'light'

export type WidgetCellProps = { component: Component; state: WidgetState }
