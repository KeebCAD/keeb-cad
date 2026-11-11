import { formatNumber } from '@keeb-cad/ui'

import { zoomPercent } from '../viewport/zoom-percent'

export function zoomReadout(zoom: number): string {
  return formatNumber(Math.round(zoomPercent(zoom)), 'percent')
}
