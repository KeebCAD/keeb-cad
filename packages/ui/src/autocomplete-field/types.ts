export type AutocompleteOption = { value: string; label: string }

export type AutocompleteFieldProps = {
  label: string
  // The label stays the input's name for screen readers only, where something beside the field
  // already shows what it is.
  labelHidden?: boolean
  error?: string
  // Muted text in the empty field.
  placeholder?: string
  // Muted text after the typed text, inside the field.
  suffix?: string
  // Already filtered: the field shows every option it is given.
  options: readonly AutocompleteOption[]
}

export type AutocompleteFieldEmits = {
  accept: [value: string]
  // Enter, or Tab, with no option active.
  commit: []
  // Esc with the list closed; the caller decides where focus goes.
  cancel: []
}
