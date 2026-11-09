import { checkScriptChunks } from './check-script-chunks.ts'
import { devtoolsProblems } from './devtools-problems.ts'

const problems = [...devtoolsProblems(), ...(await checkScriptChunks())]
if (problems.length > 0) {
  console.error(problems.join('\n'))
  process.exitCode = 1
}
