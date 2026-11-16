import type { BundleTexts } from '@keeb-cad/storage'

export interface StoredVersionRow {
  version: number
  designId: string
  name: string
  revision: string
  reason: 'autosave'
  savedAt: number
  texts: BundleTexts
}

export interface StoredDesignRow {
  id: string
  name: string
  revision: string
  lastVersion: number
  savedAt: number
}

export interface CounterRow {
  key: 'counter'
  value: number
}
