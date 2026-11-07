import type { Design, Frozen, Revision } from '@keeb-cad/schema'

export interface Mirrored {
  design: Frozen<Design>
  revision: Revision
}
