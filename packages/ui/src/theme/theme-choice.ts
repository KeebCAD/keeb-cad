import type { ThemeChoice } from './types'

export const THEME_CHOICES: readonly string[] = ['dark', 'light', 'auto'] satisfies ThemeChoice[]

export function isThemeChoice(value: string): value is ThemeChoice {
  return THEME_CHOICES.includes(value)
}
