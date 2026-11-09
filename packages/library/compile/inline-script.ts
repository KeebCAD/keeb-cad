import path from 'node:path'
import { build, type Rollup } from 'vite'

const GLOBAL_NAME = '__bp'
const ASSIGNMENT = new RegExp(String.raw`^\s*(?:"use strict";\s*)?var ${GLOBAL_NAME}\s*=\s*`)

const laneRunsOnly = (blueprint: string) =>
  `((blueprint) => ({ lanes: Object.fromEntries(Object.entries(blueprint.lanes).map(([stage, lane]) => [stage, lane.run])) }))(${blueprint}\n)`

// Vite's iife output assigns a global; the sandbox compiles the script as one returned expression.
export async function inlineScript(file: string): Promise<string> {
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    root: path.dirname(file),
    build: {
      write: false,
      minify: false,
      lib: { entry: file, formats: ['iife'], name: GLOBAL_NAME, fileName: () => 'blueprint.js' },
    },
  })
  const [output] = (Array.isArray(result) ? result : [result]) as Rollup.RollupOutput[]
  const code = output?.output[0].code
  if (code === undefined) throw new Error(`${file}: the bundler returned no code`)
  const start = ASSIGNMENT.exec(code)
  if (start === null) throw new Error(`${file}: the bundle does not assign ${GLOBAL_NAME}`)
  return laneRunsOnly(code.slice(start[0].length).trimEnd().replace(/;$/, ''))
}
