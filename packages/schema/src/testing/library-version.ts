import type { LibraryVersion } from '../types'
import { aLibraryId } from './library-id'
import { aVersion } from './version'

export function aLibraryVersion({
  id = aLibraryId(),
  version = aVersion(),
}: Partial<LibraryVersion> = {}): LibraryVersion {
  return { id, version }
}
