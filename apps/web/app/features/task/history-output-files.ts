import type { ThreadTurn } from '~/lib/api'
import type { ExportStepOutput, OutputFileInfo } from '~/components/llm-chat/message-list/types'

export function getLatestOutputFilesFromTurns(turns: ThreadTurn[]): OutputFileInfo[] {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index]
    const exportStep = turn.steps?.find(step => step.step === 'export' && step.status === 'done')
    if (!exportStep?.output) {
      continue
    }

    const output = exportStep.output as unknown as ExportStepOutput
    if (output.output_files?.length) {
      return output.output_files
    }
  }

  return []
}
