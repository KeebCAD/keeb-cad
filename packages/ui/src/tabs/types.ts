export type TabItem = { value: string; label: string }

export type TabListProps<Item extends TabItem = TabItem> = { items: readonly Item[] }

export type TabListSlots<Item extends TabItem = TabItem> = {
  hint?: (props: { item: Item }) => unknown
}

export type TabPanelProps = { value: string }
