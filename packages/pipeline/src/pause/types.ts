import type { BlueprintPin } from '@keeb-cad/blueprint'

export type PinSource = () => readonly BlueprintPin[]

/** Runs after the pause, synchronously, so no later message can slip in before it posts. */
export type RunStages = () => void
