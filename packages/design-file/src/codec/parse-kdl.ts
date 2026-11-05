import { type Document, type InvalidKdlError, parse } from '@bgotink/kdl'
import { Result } from '@keeb-cad/result'

// The reader's own messages, one per line, each with the line and column where it can tie the
// error to one. It throws nothing but InvalidKdlError.
export function parseKdl(text: string): Result<Document, string> {
  return Result.fromThrowing(
    () => parse(text, { storeLocations: true }),
    (cause) => Array.from((cause as InvalidKdlError).flat(), (error) => error.message).join('\n'),
  )
}
