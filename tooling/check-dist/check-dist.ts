import { checkScriptChunks } from './check-script-chunks.ts'
import { devtoolsProblems } from './devtools-problems.ts'
import { referenceDesignsProblems } from './reference-designs-problems.ts'

const problems = [
  ...devtoolsProblems(),
  ...referenceDesignsProblems(),
  ...(await checkScriptChunks()),
]
if (problems.length > 0) {
  console.error(problems.join('\n'))
  process.exitCode = 1
}
