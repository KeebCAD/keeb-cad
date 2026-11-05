import type { Node } from '@bgotink/kdl'
import { attempt, Result } from '@keeb-cad/result'
import { designSchema, formatVersionSchema, type LoadError } from '@keeb-cad/schema'
import * as v from 'valibot'

import { parseKdl } from '../codec/parse-kdl'
import { readKdl } from '../codec/read-kdl'
import { currentFormatVersion } from '../current-format-version'

const versionNode = 'format-version'

// Reads format-version before anything else, then the design without it.
export function readDesignFile(text: string): Result<unknown, LoadError> {
  return attempt(function* () {
    const document = yield* parseKdl(text).mapErr(unreadable)
    const [version, ...repeats] = document.nodes.filter((node) => node.getName() === versionNode)
    if (version === undefined) {
      yield* Result.err(unreadable(`The design file has no ${versionNode} node.`))
    }
    if (repeats.length > 0) {
      yield* Result.err(unreadable(`The design file has more than one ${versionNode} node.`))
    }
    const found = yield* readVersion(version as Node)
    if (found > currentFormatVersion) {
      yield* Result.err<LoadError>({ kind: 'format-too-new', found })
    }
    const rest = document.nodes.filter((node) => node !== version)
    return yield* readKdl(designSchema, rest).mapErr(unreadable)
  })
}

function readVersion(node: Node): Result<number, LoadError> {
  const bare = node.entries.length === 1 && node.children === null
  const parsed = v.safeParse(formatVersionSchema, bare ? node.getArgument(0) : undefined)
  return parsed.success
    ? Result.ok(parsed.output)
    : Result.err(unreadable(`The ${versionNode} node holds no whole number of at least 1.`))
}

function unreadable(message: string): LoadError {
  return { kind: 'file-unreadable', file: 'design', message }
}
