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
    // Stryker disable next-line CallExpression: browser-only wiring, killed by the browser specs Stryker can't run
    container.register(BrowserStorageAccess).useClass(BrowserStorageAccess)
    // Stryker disable next-line CallExpression: browser-only wiring, killed by the browser specs Stryker can't run
    container.register(StorageDatabase).useClass(StorageDatabase)
  },
}
