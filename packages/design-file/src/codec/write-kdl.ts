import { InvariantError } from '@keeb-cad/result'
import type * as v from 'valibot'

import { formatValue } from './format-value'
import { kebabCase } from './kebab-case'
import { fieldForm, fieldMetadata, listItem, resolveObject } from './schema-fields'
import type { Fields, ObjectLikeSchema } from './types'

const indentUnit = ' '.repeat(4)

// One node per top-level field, in the schema's entry order.
export function writeKdl(schema: v.GenericSchema, value: unknown): string {
  const { children } = writeFields(objectFor(schema, value), value as Fields, 0, false)
  return children.join('')
}

function writeFields(
  schema: ObjectLikeSchema,
  value: Fields,
  depth: number,
  valuesAsProperties: boolean,
): { properties: string; children: string[] } {
  let properties = ''
  const children: string[] = []
  for (const [key, field] of Object.entries(schema.entries) as [string, v.GenericSchema][]) {
    const fieldValue = value[key]
    if (fieldValue === undefined) continue
    const name = kebabCase(key)
    const form = fieldForm(field)
    if (form === 'value' && valuesAsProperties) {
      properties += ` ${name}=${formatValue(fieldValue)}`
    } else if (form === 'value') {
      children.push(`${indent(depth)}${name} ${formatValue(fieldValue)}\n`)
    } else if (form === 'object') {
      children.push(writeNode(name, objectFor(field, fieldValue), fieldValue as Fields, depth))
    } else if (fieldMetadata(field).flatten === true) {
      children.push(...writeItems(listItem(field), fieldValue as unknown[], depth))
    } else {
      const items = writeItems(listItem(field), fieldValue as unknown[], depth + 1)
      children.push(nodeText(name, '', items, depth))
    }
  }
  return { properties, children }
}

function writeItems(item: v.GenericSchema, values: readonly unknown[], depth: number): string[] {
  return values.map((value) => {
    const schema = objectFor(item, value)
    const name = fieldMetadata(schema as v.GenericSchema).node
    if (name === undefined) throw new InvariantError('A list item schema names no KDL node.')
    return writeNode(name, schema, value as Fields, depth)
  })
}

function writeNode(name: string, schema: ObjectLikeSchema, value: Fields, depth: number): string {
  const { properties, children } = writeFields(schema, value, depth + 1, true)
  return nodeText(name, properties, children, depth)
}

function nodeText(name: string, properties: string, children: string[], depth: number): string {
  const head = `${indent(depth)}${name}${properties}`
  return children.length === 0 ? `${head}\n` : `${head} {\n${children.join('')}${indent(depth)}}\n`
}

function objectFor(schema: v.GenericSchema, value: unknown): ObjectLikeSchema {
  const object = resolveObject(schema, value as Fields)
  if (object === undefined) throw new InvariantError('No variant of the schema takes the value.')
  return object
}

function indent(depth: number): string {
  return indentUnit.repeat(depth)
}
