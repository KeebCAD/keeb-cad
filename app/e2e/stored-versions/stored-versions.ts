import type { CorneyBundle } from '../corney-bundle/types'
import type { CounterRow, StoredDesignRow, StoredVersionRow } from './types'

// Both run in the page through page.evaluate, which sends only their source, so each is
// self-contained.

export async function storeVersion({ label, texts }: CorneyBundle): Promise<void> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('keeb-cad')
    request.addEventListener('success', () => resolve(request.result))
    request.addEventListener('error', () => reject(request.error))
  })
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(['versions', 'designs', 'meta'], 'readwrite')
      transaction.addEventListener('complete', () => resolve())
      transaction.addEventListener('error', () => reject(transaction.error))
      transaction.addEventListener('abort', () => reject(transaction.error))
      const meta = transaction.objectStore('meta')
      const read = meta.get('counter')
      read.addEventListener('success', () => {
        const counter = ((read.result as CounterRow | undefined)?.value ?? 0) + 1
        const savedAt = Date.now()
        const { id, name, revision } = label
        meta.put({ key: 'counter', value: counter } satisfies CounterRow)
        transaction.objectStore('versions').add({
          version: counter,
          designId: id,
          name,
          revision,
          reason: 'autosave',
          savedAt,
          texts,
        } satisfies StoredVersionRow)
        transaction.objectStore('designs').put({
          id,
          name,
          revision,
          lastVersion: counter,
          savedAt,
        } satisfies StoredDesignRow)
      })
    })
  } finally {
    database.close()
  }
}

export async function newestStoredDesignText(designId: string): Promise<string | undefined> {
  const database = await new Promise<IDBDatabase | undefined>((resolve, reject) => {
    const request = indexedDB.open('keeb-cad')
    // Before the app's first open there is no database, and creating one here would leave it
    // without the app's stores.
    request.addEventListener('upgradeneeded', () => {
      request.transaction?.abort()
      resolve(undefined)
    })
    request.addEventListener('success', () => resolve(request.result))
    request.addEventListener('error', (event) => {
      event.preventDefault()
      reject(request.error)
    })
  })
  if (database === undefined) return undefined
  try {
    const rows = await new Promise<StoredVersionRow[]>((resolve, reject) => {
      const request = database
        .transaction('versions', 'readonly')
        .objectStore('versions')
        .index('designId')
        .getAll(designId)
      request.addEventListener('success', () => resolve(request.result as StoredVersionRow[]))
      request.addEventListener('error', () => reject(request.error))
    })
    const newest = rows.reduce<StoredVersionRow | undefined>(
      (found, row) => (found === undefined || row.version > found.version ? row : found),
      undefined,
    )
    return newest?.texts.design
  } finally {
    database.close()
  }
}

export async function storedDesignCount(): Promise<number> {
  const database = await new Promise<IDBDatabase | undefined>((resolve, reject) => {
    const request = indexedDB.open('keeb-cad')
    // Before the app's first open there is no database, and creating one here would leave it
    // without the app's stores.
    request.addEventListener('upgradeneeded', () => {
      request.transaction?.abort()
      resolve(undefined)
    })
    request.addEventListener('success', () => resolve(request.result))
    request.addEventListener('error', (event) => {
      event.preventDefault()
      reject(request.error)
    })
  })
  if (database === undefined) return 0
  try {
    return await new Promise<number>((resolve, reject) => {
      const request = database.transaction('designs', 'readonly').objectStore('designs').count()
      request.addEventListener('success', () => resolve(request.result))
      request.addEventListener('error', () => reject(request.error))
    })
  } finally {
    database.close()
  }
}
