import { inject } from '@keeb-cad/di'
import type { Id } from '@keeb-cad/schema'
import Dexie, { type Table } from 'dexie'

import type { StoredDesign, VersionId } from '../backend/types'
import { BrowserStorageAccess } from './browser-storage-access'
import type { MetaRow, VersionRow } from './types'

export class StorageDatabase extends Dexie {
  declare readonly versions: Table<VersionRow, VersionId>
  declare readonly designs: Table<StoredDesign, Id>
  declare readonly meta: Table<MetaRow, MetaRow['key']>

  constructor() {
    const access = inject(BrowserStorageAccess)
    // Both: a query throws MissingAPIError without the key range.
    super(access.name, { indexedDB: access.factory, IDBKeyRange: access.keyRange })
    this.version(1).stores({ versions: 'version, designId', designs: 'id', meta: 'key' })
  }
}
