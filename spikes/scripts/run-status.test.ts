import { describe, expect, it } from 'vitest'
import { runStatus } from './run-status'

describe('runStatus', () => {
  it('maps each worker response to a scorecard run status', () => {
    expect(runStatus({ status: 'solved' })).toBe('solved')
    expect(runStatus({ status: 'timeout' })).toBe('timeout')
    expect(runStatus({ status: 'failed', thrown: false })).toBe('failed')
    expect(runStatus({ status: 'failed', thrown: true })).toBe('threw')
    expect(runStatus({ status: 'probed' })).toBe('failed')
  })
})
