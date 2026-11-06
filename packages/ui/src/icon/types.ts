import type { icons } from './icons'

export type IconName = keyof typeof icons

export type IconProps = { name: IconName; label?: string }
