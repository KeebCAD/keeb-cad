import type { Rejection } from '@keeb-cad/schema'

export type RefusedStep = { command: string; input: unknown; rejection: Rejection }
