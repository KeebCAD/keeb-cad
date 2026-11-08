import type { SeverityCountProps } from '../../src/severity-count/types'
import type { WidgetState } from './types'

export const severityCountStates: readonly WidgetState<SeverityCountProps>[] = [
  { name: 'no errors', props: { severity: 'error', count: 0 } },
  { name: 'one error', props: { severity: 'error', count: 1 } },
  { name: 'many errors', props: { severity: 'error', count: 12 } },
  { name: 'dimmed errors', props: { severity: 'error', count: 0, dimmed: true } },
  { name: 'no warnings', props: { severity: 'warning', count: 0 } },
  { name: 'one warning', props: { severity: 'warning', count: 1 } },
  { name: 'many warnings', props: { severity: 'warning', count: 12 } },
  { name: 'dimmed warnings', props: { severity: 'warning', count: 3, dimmed: true } },
]
