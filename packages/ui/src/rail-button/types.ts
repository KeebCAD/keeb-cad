import type { IconName } from '../icon/types'

export type RailButtonProps = { icon: IconName; label: string; expanded: boolean }

export type RailButtonEmits = { click: [event: MouseEvent] }
