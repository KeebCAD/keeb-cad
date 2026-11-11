import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { HotkeyLayer } from './hotkey-layer'
import type { HotkeyEntry } from './types'

const R = { id: 'rotate', hotkey: 'R' }
const T = { id: 'tree', hotkey: 'T' }
const K = { id: 'keys', hotkey: 'K' }
const Q = { id: 'quit-pick', hotkey: 'Q' }
const DUPLICATE = { id: 'duplicate', hotkey: 'mod+D' }

const CTRL_D = { key: 'd', code: 'KeyD', ctrlKey: true }

function arrange(
  entries: readonly HotkeyEntry[],
  ran = true,
  isModalOpen: () => boolean = () => false,
) {
  const onHotkey = vi.fn<(id: string) => boolean>(() => ran)
  const layer = new HotkeyLayer(document, onHotkey, isModalOpen)
  onTestFinished(() => layer.destroy())
  layer.replaceHotkeys(entries)
  return { layer, onHotkey }
}

function focusOn(element: HTMLElement): HTMLElement {
  document.body.append(element)
  onTestFinished(() => element.remove())
  element.focus()
  return element
}

function anInput(): HTMLElement {
  return focusOn(document.createElement('input'))
}

function anEditableDiv(): HTMLElement {
  const div = document.createElement('div')
  div.contentEditable = 'true'
  return focusOn(div)
}

function press(init: KeyboardEventInit, target: EventTarget = document): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  target.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, ...init }))
  return event
}

describe('HotkeyLayer', () => {
  it('matches a letter by its physical key when the key types a non-Latin character', () => {
    const { onHotkey } = arrange([R])

    press({ key: 'к', code: 'KeyR' })

    expect(onHotkey.mock.calls).toEqual([[R.id]])
  })

  it('matches a letter by the Latin letter the key types', () => {
    const { onHotkey } = arrange([R])

    press({ key: 'r', code: 'KeyR' })

    expect(onHotkey.mock.calls).toEqual([[R.id]])
  })

  it('fires only the typed letter when another letter sits at that physical key (Dvorak)', () => {
    const { onHotkey } = arrange([T, K])

    press({ key: 't', code: 'KeyK' })

    expect(onHotkey.mock.calls).toEqual([[T.id]])
  })

  it('ignores a physical position whose key types another Latin letter (AZERTY)', () => {
    const { onHotkey } = arrange([Q])

    press({ key: 'a', code: 'KeyQ' })

    expect(onHotkey).not.toHaveBeenCalled()
  })

  it('fires nothing from a focused text field', () => {
    const { onHotkey } = arrange([R])
    const input = document.createElement('input')
    document.body.append(input)
    onTestFinished(() => input.remove())
    input.focus()

    press({ key: 'r', code: 'KeyR' }, input)

    expect(onHotkey).not.toHaveBeenCalled()
  })

  it('keeps a chord out of a focused text field', () => {
    const { onHotkey } = arrange([DUPLICATE])
    const input = anInput()

    const event = press(CTRL_D, input)

    expect({ called: onHotkey.mock.calls, prevented: event.defaultPrevented }).toEqual({
      called: [],
      prevented: false,
    })
  })

  it('keeps a letter and a chord out of a focused editable element', () => {
    const { onHotkey } = arrange([R, DUPLICATE])
    const div = anEditableDiv()

    const letter = press({ key: 'r', code: 'KeyR' }, div)
    const chord = press(CTRL_D, div)

    expect({
      called: onHotkey.mock.calls,
      prevented: [letter.defaultPrevented, chord.defaultPrevented],
    }).toEqual({ called: [], prevented: [false, false] })
  })

  it('lets a letter typed in a text field land in it', async () => {
    const { onHotkey } = arrange([R])
    const input = anInput()

    await userEvent.keyboard('r')

    expect({ value: (input as HTMLInputElement).value, called: onHotkey.mock.calls }).toEqual({
      value: 'r',
      called: [],
    })
  })

  it('lets a letter typed in an editable element land in it', async () => {
    const { onHotkey } = arrange([R])
    const div = anEditableDiv()

    await userEvent.keyboard('r')

    expect({ text: div.textContent, called: onHotkey.mock.calls }).toEqual({
      text: 'r',
      called: [],
    })
  })

  describe('while a modal is open', () => {
    it('runs no letter and leaves its key unprevented', () => {
      const { onHotkey } = arrange([R], true, () => true)

      const event = press({ key: 'r', code: 'KeyR' })

      expect({ called: onHotkey.mock.calls, prevented: event.defaultPrevented }).toEqual({
        called: [],
        prevented: false,
      })
    })

    it('runs no chord and leaves its key unprevented', () => {
      const { onHotkey } = arrange([DUPLICATE], true, () => true)

      const event = press(CTRL_D)

      expect({ called: onHotkey.mock.calls, prevented: event.defaultPrevented }).toEqual({
        called: [],
        prevented: false,
      })
    })

    it('asks at each keydown, so the key runs once the modal has closed', () => {
      const isModalOpen = vi.fn(() => false).mockReturnValueOnce(true)
      const { onHotkey } = arrange([R], true, isModalOpen)

      const whileOpen = press({ key: 'r', code: 'KeyR' })
      const onceClosed = press({ key: 'r', code: 'KeyR' })

      expect({
        called: onHotkey.mock.calls,
        prevented: [whileOpen.defaultPrevented, onceClosed.defaultPrevented],
      }).toEqual({ called: [[R.id]], prevented: [false, true] })
    })
  })

  it('drops the replaced entries', () => {
    const A = { id: 'add', hotkey: 'A' }
    const B = { id: 'bend', hotkey: 'B' }
    const { layer, onHotkey } = arrange([A])
    layer.replaceHotkeys([B])

    press({ key: 'a', code: 'KeyA' })

    expect(onHotkey).not.toHaveBeenCalled()
  })

  it('fires nothing once replaced by no entries', () => {
    const { layer, onHotkey } = arrange([R])
    layer.replaceHotkeys([])

    press({ key: 'r', code: 'KeyR' })

    expect(onHotkey).not.toHaveBeenCalled()
  })

  it('fires nothing once destroyed', () => {
    const { layer, onHotkey } = arrange([R])
    layer.destroy()

    press({ key: 'r', code: 'KeyR' })

    expect(onHotkey).not.toHaveBeenCalled()
  })

  it.each([
    ['leaves a plain key to the focused element when the handler did not run it', false, false],
    ['claims a plain key when the handler ran it', true, true],
  ])('%s', (_role, ran, expectedPrevented) => {
    arrange([{ id: 'delete', hotkey: 'Delete' }], ran)

    const event = press({ key: 'Delete', code: 'Delete' })

    expect(event.defaultPrevented).toBe(expectedPrevented)
  })

  it.each([
    ['a Ctrl chord', 'mod+D', { key: 'd', code: 'KeyD', ctrlKey: true }, true],
    ['a Meta chord', 'meta+D', { key: 'd', code: 'KeyD', metaKey: true }, true],
    ['an Alt+arrow', 'alt+ArrowLeft', { key: 'ArrowLeft', code: 'ArrowLeft', altKey: true }, true],
    [
      'a Shift chord, no Ctrl or Meta one',
      'shift+F6',
      { key: 'F6', code: 'F6', shiftKey: true },
      false,
    ],
  ])(
    'with an entry that did not run, prevents %s only when it is a Ctrl, Meta or Alt+arrow chord',
    (_role, hotkey, init, expectedPrevented) => {
      const { onHotkey } = arrange([{ id: 'entry', hotkey }], false)

      const event = press(init)

      expect({ called: onHotkey.mock.calls, prevented: event.defaultPrevented }).toEqual({
        called: [['entry']],
        prevented: expectedPrevented,
      })
    },
  )

  it("leaves another layout's chord on the same physical key alone (Dvorak's Ctrl+E)", () => {
    const { onHotkey } = arrange([{ id: 'duplicate', hotkey: 'mod+D' }])

    const event = press({ key: 'e', code: 'KeyD', ctrlKey: true })

    expect({ called: onHotkey.mock.calls, prevented: event.defaultPrevented }).toEqual({
      called: [],
      prevented: false,
    })
  })

  it("prevents a matched chord's default", () => {
    arrange([{ id: 'palette', hotkey: 'ctrl+K' }])

    const event = press({ key: 'k', code: 'KeyK', ctrlKey: true })

    expect(event.defaultPrevented).toBe(true)
  })

  it('throws on a bad hotkey and keeps the entries it had', () => {
    const { layer, onHotkey } = arrange([R])

    expect(() => layer.replaceHotkeys([T, { id: 'broken', hotkey: 'mod+' }])).toThrow(
      'Invalid hotkey "mod+"',
    )
    press({ key: 'r', code: 'KeyR' })
    expect(onHotkey.mock.calls).toEqual([[R.id]])
  })
})
