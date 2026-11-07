import type { Module } from '@keeb-cad/di'

import { storageBackend } from './backend/storage-backend'
import { BrowserBackend } from './browser/browser-backend'
import { BrowserStorageAccess } from './browser/browser-storage-access'
import { StorageDatabase } from './browser/storage-database'
import { DesignStorage } from './design-storage/design-storage'

export const storageModule: Module = {
  register(container) {
    container.register(DesignStorage).useClass(DesignStorage)
    container.register(storageBackend).useClass(BrowserBackend)
    container.register(BrowserStorageAccess).useClass(BrowserStorageAccess)
    container.register(StorageDatabase).useClass(StorageDatabase)
  },
}
