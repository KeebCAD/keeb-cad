import { describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'

import { autocompleteFieldStates } from '../../workbench/states/autocomplete-field-states'
import '../theme/theme.css'
import type { AutocompleteOption } from './types'
import UiAutocompleteField from './UiAutocompleteField.vue'

const LABEL = 'gap x'
const NEXT = 'Next'
const ERROR = 'Not a quantity in mm.'
const OPTIONS: readonly AutocompleteOption[] = [
  { value: 'wall', label: 'wall = 2 mm' },
  { value: 'wide', label: 'wide ≈ 2.37 mm' },
]

type Emitted = ['accept', string] | ['commit'] | ['cancel']

// Holds the text, the caret and the list's open state as a caller would, recording what the field
// emits; a button after it takes focus that moves on.
async function arrange({ error, options = OPTIONS }: Arrangement = {}) {
  const text = shallowRef('')
  const open = shallowRef(false)
  const cursor = shallowRef(0)
  const emitted: Emitted[] = []
  await render({
    render: () => [
      h(UiAutocompleteField, {
        label: LABEL,
        error,
        options,
        modelValue: text.value,
        'onUpdate:modelValue': (value: string) => {
          text.value = value
        },
        open: open.value,
        // A list with no options stays closed, as a caller filtering its options keeps it.
        'onUpdate:open': (value: boolean) => {
          open.value = value && options.length > 0
        },
        cursor: cursor.value,
        'onUpdate:cursor': (value: number) => {
          cursor.value = value
        },
        onAccept: (value: string) => emitted.push(['accept', value]),
        onCommit: () => emitted.push(['commit']),
        onCancel: () => emitted.push(['cancel']),
      }),
      h('button', { type: 'button' }, NEXT),
    ],
  })
  return { text, open, cursor, emitted }
}

type Arrangement = { error?: string; options?: readonly AutocompleteOption[] }

const field = () => page.getByRole('combobox', { name: LABEL })
const list = () => page.getByRole('listbox')
const option = (name: string) => page.getByRole('option', { name })

// Typing opens the list, and Reka highlights its first option.
async function typeAndOpen(typed: string) {
  await userEvent.type(field(), typed)
  await expect.element(option('wall = 2 mm')).toHaveAttribute('data-highlighted')
}

// Throws for a renamed state, so the test using it can't vanish.
function stateNamed(name: string) {
  const state = autocompleteFieldStates.find((candidate) => candidate.name === name)
  if (state === undefined) throw new Error(`The workbench has no state named "${name}".`)
  return state
}

describe('AutocompleteField', () => {
  it.each(autocompleteFieldStates)(
    'renders the $name state as a combobox named by its label',
    async (state) => {
      const screen = await render(UiAutocompleteField, { props: state.props })

      await expect
        .element(screen.getByRole('combobox', { name: LABEL }))
        .toHaveValue(state.props.modelValue)
    },
  )

  it('with an error is invalid, described by the error and named by its label', async () => {
    await arrange({ error: ERROR })

    await expect.element(field()).toHaveAttribute('aria-invalid', 'true')
    await expect.element(field()).toHaveAccessibleDescription(ERROR)
  })

  it('with no error is not invalid and has no description', async () => {
    await arrange()

    await expect.element(field()).not.toHaveAttribute('aria-invalid')
    await expect.element(field()).toHaveAccessibleDescription('')
  })

  it('shows its placeholder in the empty with a placeholder state', async () => {
    const state = stateNamed('empty with a placeholder')
    const screen = await render(UiAutocompleteField, { props: state.props })

    await expect
      .element(screen.getByRole('combobox', { name: LABEL }))
      .toHaveAttribute('placeholder', state.props.placeholder)
  })

  it('keeps its label as the name of the input in the with its label hidden state, the label one pixel square', async () => {
    const state = stateNamed('with its label hidden')
    const screen = await render(UiAutocompleteField, { props: state.props })

    await expect.element(screen.getByRole('combobox', { name: LABEL })).toBeVisible()
    const { width, height } = screen.getByText(LABEL).element().getBoundingClientRect()
    expect({ width, height }).toEqual({ width: 1, height: 1 })
  })

  it('hangs its open list from the input box, over the error, in the with its list open over an error state', async () => {
    const state = stateNamed('with its list open over an error')
    const screen = await render(UiAutocompleteField, { props: state.props })
    await expect.element(screen.getByRole('listbox')).toBeVisible()

    // The box the input sits in, whose border is the field's bottom edge.
    const box = screen.getByRole('combobox', { name: LABEL }).element().parentElement
    const boxBottom = box?.getBoundingClientRect().bottom ?? NaN
    const list = screen.getByRole('listbox').element().getBoundingClientRect()
    const error = screen.getByRole('paragraph').element().getBoundingClientRect()

    expect({
      belowBox: list.top >= boxBottom,
      coversError: list.top < error.bottom && list.bottom > error.top,
    }).toEqual({ belowBox: true, coversError: true })
  })

  it('shows its suffix after the text', async () => {
    const screen = await render(UiAutocompleteField, {
      props: { label: LABEL, options: [], suffix: '= 5.37 mm', modelValue: 'stagger + 0.37mm' },
    })

    await expect.element(screen.getByText('= 5.37 mm')).toBeVisible()
  })

  it('keeps the field and its listbox exposed while the list is open', async () => {
    await arrange()

    await typeAndOpen('w')

    await expect.element(field()).toBeVisible()
    await expect.element(list()).toBeVisible()
  })

  it('accepts the highlighted option on Enter with the list open, without a commit', async () => {
    const { emitted } = await arrange()
    await typeAndOpen('w')

    await userEvent.keyboard('{Enter}')

    expect(emitted).toEqual([['accept', 'wall']])
  })

  it('accepts the active option on Tab with the list open, keeping focus, without a commit', async () => {
    const { emitted } = await arrange()
    await typeAndOpen('w')
    await userEvent.keyboard('{ArrowDown}')
    await expect.element(option('wide ≈ 2.37 mm')).toHaveAttribute('data-highlighted')

    await userEvent.keyboard('{Tab}')

    expect(emitted).toEqual([['accept', 'wide']])
    await expect.element(field()).toHaveFocus()
  })

  it('leaves the text alone when an option is accepted', async () => {
    const { text } = await arrange()
    await typeAndOpen('w')

    await userEvent.keyboard('{Enter}')

    expect(text.value).toBe('w')
  })

  it('commits on Enter with the list closed', async () => {
    const { emitted } = await arrange({ options: [] })
    await userEvent.type(field(), '3mm')

    await userEvent.keyboard('{Enter}')

    expect(emitted).toEqual([['commit']])
  })

  it('commits on Tab with the list closed and lets focus move on', async () => {
    const { emitted } = await arrange({ options: [] })
    await userEvent.type(field(), '3mm')

    await userEvent.keyboard('{Tab}')

    expect(emitted).toEqual([['commit']])
    await expect.element(page.getByRole('button', { name: NEXT })).toHaveFocus()
  })

  it('moves the caret, not the highlight, on Home and End with the list open', async () => {
    const { cursor } = await arrange()
    await typeAndOpen('wa')
    await userEvent.keyboard('{ArrowLeft}')

    await userEvent.keyboard('{Home}')
    const atHome = cursor.value
    await userEvent.keyboard('{End}')

    expect({ atHome, atEnd: cursor.value }).toEqual({ atHome: 0, atEnd: 2 })
    await expect.element(option('wall = 2 mm')).toHaveAttribute('data-highlighted')
  })

  it('closes the list on Esc with it open, keeping focus and text, without a cancel', async () => {
    const { emitted, text, open } = await arrange()
    await typeAndOpen('w')

    await userEvent.keyboard('{Escape}')

    await expect.element(list()).not.toBeInTheDocument()
    await expect.element(field()).toHaveFocus()
    expect({ emitted, text: text.value, open: open.value }).toEqual({
      emitted: [],
      text: 'w',
      open: false,
    })
  })

  it('cancels on Esc with the list closed, leaving focus to its caller', async () => {
    const { emitted } = await arrange({ options: [] })
    await userEvent.type(field(), '3mm')

    await userEvent.keyboard('{Escape}')

    expect(emitted).toEqual([['cancel']])
    await expect.element(field()).toHaveFocus()
  })

  it('places the caret where its caller puts it', async () => {
    const { cursor } = await arrange({ options: [] })
    await userEvent.type(field(), '1mm + 2mm')

    cursor.value = 3

    await expect.poll(() => (field().element() as HTMLInputElement).selectionStart).toBe(3)
  })
})
