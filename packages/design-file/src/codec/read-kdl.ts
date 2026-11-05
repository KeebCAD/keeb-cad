import { getLocation, type Node } from '@bgotink/kdl'
import { attempt, Result } from '@keeb-cad/result'
import type * as v from 'valibot'

import { camelCase } from './camel-case'
import { fieldForm, fieldMetadata, listItem, resolveObject } from './schema-fields'
import type { Fields, NodeContent, ObjectLikeSchema, ReadStep } from './types'

// Shapes the nodes into the value the schema describes, without checking it: the schema's parse
// does that. Whatever the schema has no place for is passed on under its own key, so the parse
// refuses it. Fails only on a node repeated where one is expected.
export function readKdl(schema: v.GenericSchema, nodes: readonly Node[]): Result<unknown, string> {
  return attempt(function* () {
    const content: NodeContent = {
      arguments: [],
      properties: new Map(),
      propertyLines: new Map(),
      children: nodes,
    }
    return yield* readFields(resolveObject(schema, {}), content)
  })
}

function* readFields(schema: ObjectLikeSchema | undefined, content: NodeContent): ReadStep<Fields> {
  const fields: Fields = shellOf(content)
  const entries = (schema?.entries ?? {}) as Record<string, v.GenericSchema>
  const flattened = Object.entries(entries).find(
    ([, field]) => fieldMetadata(field).flatten === true,
  )?.[0]
  const propertyLines = new Map(
    [...content.propertyLines].map(([name, line]) => [camelCase(name), { name, line }]),
  )
  const flattenedProperty = flattened === undefined ? undefined : propertyLines.get(flattened)
  if (flattenedProperty !== undefined) {
    yield* Result.err(
      `The field "${flattenedProperty.name}" is both a property and a list of nodes, on line ${flattenedProperty.line}.`,
    )
  }
  const items: Node[] = []
  const seen = new Map<string, Node>()
  for (const child of content.children) {
    const key = camelCase(child.getName())
    const field = entries[key]
    if (flattened !== undefined && (field === undefined || key === flattened)) {
      items.push(child)
      continue
    }
    const property = propertyLines.get(key)
    if (property !== undefined) {
      yield* Result.err(
        `The field "${child.getName()}" is both a property and a node, on lines ${property.line} and ${lineOf(child)}.`,
      )
    }
    const earlier = seen.get(key)
    if (earlier !== undefined) yield* Result.err(repeatedNode(earlier, child))
    seen.set(key, child)
    fields[key] = field === undefined ? yield* readLoose(child) : yield* readField(field, child)
  }
  if (flattened !== undefined) {
    fields[flattened] = yield* readItems(listItem(entries[flattened] as v.GenericSchema), items)
  }
  return fields
}

function* readField(schema: v.GenericSchema, node: Node): ReadStep<unknown> {
  const content = contentOf(node)
  switch (fieldForm(schema)) {
    case 'value': {
      return yield* readLoose(node)
    }
    case 'object': {
      return yield* readFields(resolveObject(schema, shellOf(content)), content)
    }
    case 'list': {
      const bare = content.arguments.length === 0 && content.properties.size === 0
      return bare ? yield* readItems(listItem(schema), content.children) : yield* readLoose(node)
    }
  }
}

function* readItems(item: v.GenericSchema, nodes: readonly Node[]): ReadStep<unknown[]> {
  const values: unknown[] = []
  for (const node of nodes) {
    const content = contentOf(node)
    const object = resolveObject(item, shellOf(content))
    const misnamed =
      object !== undefined && fieldMetadata(object as v.GenericSchema).node !== node.getName()
    values.push(
      misnamed
        ? { [camelCase(node.getName())]: yield* readLoose(node) }
        : yield* readFields(object, content),
    )
  }
  return values
}

// A node read with no schema: its one argument when that is all it holds, else its fields.
function* readLoose(node: Node): ReadStep<unknown> {
  const content = contentOf(node)
  const bareValue =
    content.arguments.length === 1 && content.properties.size === 0 && content.children.length === 0
  return bareValue ? content.arguments[0] : yield* readFields(undefined, content)
}

function contentOf(node: Node): NodeContent {
  return {
    arguments: node.getArguments(),
    properties: node.getProperties(),
    propertyLines: new Map(
      [...node.getPropertyEntryMap()].map(([name, entry]) => [
        name,
        getLocation(entry)?.start.line,
      ]),
    ),
    children: node.children?.nodes ?? [],
  }
}

// Arguments go under their index, which no schema defines.
function shellOf(content: NodeContent): Fields {
  const fields: Fields = {}
  for (const [index, argument] of content.arguments.entries()) fields[String(index)] = argument
  for (const [name, value] of content.properties) fields[camelCase(name)] = value
  return fields
}

function repeatedNode(earlier: Node, repeat: Node): string {
  return `The node "${repeat.getName()}" appears more than once, on lines ${lineOf(earlier)} and ${lineOf(repeat)}.`
}

function lineOf(node: Node): number | undefined {
  return getLocation(node)?.start.line
}
