export type DialogProps = { open: boolean }

export type DialogEmits = { 'update:open': [open: boolean] }

export type DialogSlots = { title(): unknown; default(): unknown }
