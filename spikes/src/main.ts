import { brokenBoard, testBoard } from './test-board'
import type { RouteRequest, RouteResponse } from './protocol'

const result = document.querySelector<HTMLPreElement>('#result')
if (!result) throw new Error('#result missing')

function show(status: string, body: unknown): void {
  result!.textContent = JSON.stringify(body, null, 2)
  result!.dataset.status = status
}

const worker = new Worker(new URL('./route.worker.ts', import.meta.url), { type: 'module' })
worker.addEventListener('message', (event: MessageEvent<RouteResponse>) => {
  show(event.data.status, event.data)
})
worker.addEventListener('error', (event) => {
  show('failed', { status: 'failed', error: `worker error: ${event.message}` })
})

const params = new URLSearchParams(location.search)
const request: RouteRequest = {
  board: params.has('broken') ? brokenBoard : testBoard,
  probe: params.has('probe'),
}
worker.postMessage(request)
