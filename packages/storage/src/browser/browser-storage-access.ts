// The browser storage the backend opens: the browser's own, unless a test registers another.
export class BrowserStorageAccess {
  readonly factory: IDBFactory = indexedDB
  readonly keyRange: typeof IDBKeyRange = IDBKeyRange
  readonly name: string = 'keeb-cad'
}
