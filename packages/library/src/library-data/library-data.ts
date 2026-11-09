import type { LibraryData } from '@keeb-cad/schema'

import { declarations } from './declarations'
import { loadScript } from './load-script'

export const libraryData: LibraryData = { declarations, loadScript }
