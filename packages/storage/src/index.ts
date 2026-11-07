export { writeBundle } from './bundle/write-bundle'
export { readBundle } from './bundle/read-bundle'
export type { BundleTexts, DesignBundle, LoadedBundle } from './bundle/types'

export { DesignStorage } from './design-storage/design-storage'
export type {
  DesignLabel,
  DesignSummary,
  LoadFailure,
  SaveError,
  StorageUnavailable,
} from './design-storage/types'
export type { VersionId, VersionSummary } from './backend/types'

export { BrowserStorageAccess } from './browser/browser-storage-access'

export { storageModule } from './storage-module'
