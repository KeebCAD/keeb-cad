import { Document, format, Node } from '@bgotink/kdl'
import { InvariantError } from '@keeb-cad/result'
import { compareId } from '@keeb-cad/schema'
import type * as v from 'valibot'

import { codecValue } from './codec-value'
import { kebabCase } from './kebab-case'
import { fieldForm, fieldMetadata, listItem, recordValue, resolveObject } from './schema-fields'
import type { Fields, ObjectLikeSchema } from './types'

// One node per top-level field, in the schema's entry order; a primitive one holds its value as
// the node's argument.
export function writeKdl(schema: v.GenericSchema, value: unknown): string {
  const nodes = fieldsOf(objectFor(schema, value), value as Fields).flatMap(
    ([key, field, fieldValue]) => {
      if (fieldForm(field) !== 'value') return childNodes(key, field, fieldValue)
      const node = Node.create(kebabCase(key))
      node.addArgument(codecValue(fieldValue))
      return [node]
    },
  )
  return format(new Document(nodes))
}

function writeNode(name: string, schema: ObjectLikeSchema, value: Fields): Node {
  const node = Node.create(name)
  for (const [key, field, fieldValue] of fieldsOf(schema, value)) {
    if (fieldForm(field) === 'value') {
      node.setProperty(kebabCase(key), codecValue(fieldValue))
    } else {
      for (const child of childNodes(key, field, fieldValue)) node.appendNode(child)
    }
  }
  return node
}

function childNodes(key: string, field: v.GenericSchema, value: unknown): Node[] {
  const name = kebabCase(key)
  const form = fieldForm(field)
  if (form === 'object') return [writeNode(name, objectFor(field, value), value as Fields)]
  if (form === 'record') return [writeRecord(name, recordValue(field), value as Fields)]
  const items = writeItems(listItem(field), value as unknown[])
  if (fieldMetadata(field).flatten === true) return items
  const list = Node.create(name)
  for (const item of items) list.appendNode(item)
  return [list]
}

function writeRecord(name: string, entry: v.GenericSchema, record: Fields): Node {
  const node = Node.create(name)
  for (const key of Object.keys(record).toSorted(compareId)) {
    node.appendNode(writeEntry(key, entry, record[key]))
  }
  return node
}

function writeEntry(key: string, schema: v.GenericSchema, value: unknown): Node {
  if (typeof value === 'object' && value !== null) {
    return writeNode(key, objectFor(schema, value), value as Fields)
  }
  const node = Node.create(key)
  node.addArgument(codecValue(value))
  return node
}

function writeItems(item: v.GenericSchema, values: readonly unknown[]): Node[] {
  return values.map((value) => {
    const schema = objectFor(item, value)
    const name = fieldMetadata(schema as v.GenericSchema).node
    if (name === undefined) throw new InvariantError('A list item schema names no KDL node.')
    return writeNode(name, schema, value as Fields)
  })
}

// An absent optional field is omitted.
function fieldsOf(schema: ObjectLikeSchema, value: Fields): [string, v.GenericSchema, unknown][] {
  return (Object.entries(schema.entries) as [string, v.GenericSchema][])
    .filter(([key]) => value[key] !== undefined)
    .map(([key, field]) => [key, field, value[key]])
}

function objectFor(schema: v.GenericSchema, value: unknown): ObjectLikeSchema {
  const object = resolveObject(schema, value as Fields)
  if (object === undefined) throw new InvariantError('No variant of the schema takes the value.')
  return object
}
