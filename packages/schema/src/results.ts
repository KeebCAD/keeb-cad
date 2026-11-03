import type { Id } from './kinds'

// Refusals (AD-2, Data Schema): values code builds and nothing parses, so plain TypeScript.

/** What a rejection names: `Id` for now; it becomes a union as stories name other ids (LibraryId in 13.18). */
export type ItemId = Id

/**
 * A plain copy of a Valibot issue, so callers never see Valibot's issue type: object keys and
 * array indexes, `[]` for a root issue.
 */
export type SchemaIssue = { path: (string | number)[]; message: string }

/** A closed union; each member is added by the story that rejects with it (13.3: the cycle). */
export type ModelRejectionKind = never

/** A command refused; nothing changed. The register's own kinds carry no message. */
export type Rejection =
  | { kind: 'input-invalid'; command: string; issues: SchemaIssue[] }
  | { kind: 'unavailable'; command: string }
  | { kind: 'stale'; seq: number; latest: number }
  | { kind: ModelRejectionKind; ids: ItemId[]; message: string }

/** `replaceDesign`'s refusal: the value failed the design schema. */
export type DesignInvalid = { kind: 'design-invalid'; issues: SchemaIssue[] }
