export type AutocompleteOption = { value: string; label: string }

export type AutocompleteFieldProps = {
  label: string
  error?: string
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
