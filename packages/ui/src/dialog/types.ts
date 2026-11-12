export type DialogProps = { open: boolean }

// The person's wish to leave (Esc, a press outside); the owner decides whether `open` turns false.
export type DialogEmits = { dismiss: [] }

export type DialogSlots = { title(): unknown; default(): unknown }
