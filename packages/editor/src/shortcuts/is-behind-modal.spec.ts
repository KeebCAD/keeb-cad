import { describe, expect, it, onTestFinished } from 'vitest'

import { isBehindModal } from './is-behind-modal'

type Hidden = { parent?: string; root?: string; child?: string }

function arrange({ parent, root, child }: Hidden): Element {
  const parentElement = document.createElement('div')
  const rootElement = document.createElement('div')
  const childElement = document.createElement('div')
  if (parent !== undefined) parentElement.setAttribute('aria-hidden', parent)
  if (root !== undefined) rootElement.setAttribute('aria-hidden', root)
  if (child !== undefined) childElement.setAttribute('aria-hidden', child)
  rootElement.append(childElement)
  parentElement.append(rootElement)
  document.body.append(parentElement)
  onTestFinished(() => parentElement.remove())
  return rootElement
}

describe('isBehindModal', () => {
  it.each([
    ['the root is hidden', { root: 'true' }, true],
    ['its parent is hidden', { parent: 'true' }, true],
    ['nothing is hidden', {}, false],
    ['only a child of the root is hidden', { child: 'true' }, false],
    ['the root is marked not hidden', { root: 'false' }, false],
  ])('answers whether the root is behind a modal when %s', (_role, hidden: Hidden, expected) => {
    const root = arrange(hidden)

    expect(isBehindModal(root)).toBe(expected)
  })
})
