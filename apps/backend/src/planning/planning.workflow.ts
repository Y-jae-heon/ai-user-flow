import { Injectable } from '@nestjs/common'
import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import { type PlanningAiRequest } from './planning.ai-client'
import { type PlanningExtractionResult, type PlanningInput } from './dto/planning.dto'

interface PlanningWorkflowInput {
  sessionId: string
  input: PlanningInput
  extract: (request: PlanningAiRequest) => Promise<PlanningExtractionResult>
}

interface PlanningWorkflowResult {
  extraction: PlanningExtractionResult | null
  error: string | null
}

const WorkflowState = Annotation.Root({
  sessionId: Annotation<string>(),
  input: Annotation<PlanningInput>(),
  extraction: Annotation<PlanningExtractionResult | null>(),
  error: Annotation<string | null>(),
  extractor: Annotation<((request: PlanningAiRequest) => Promise<PlanningExtractionResult>) | null>()
})

@Injectable()
export class PlanningWorkflow {
  async run(input: PlanningWorkflowInput): Promise<PlanningWorkflowResult> {
    const graph = new StateGraph(WorkflowState)
      .addNode('extract_planning_logic', async (state: typeof WorkflowState.State) => {
        if (!state.extractor) {
          return {
            extraction: null,
            error: 'AI extraction function is unavailable.'
          }
        }

        try {
          return {
            extraction: await state.extractor({
              sessionId: state.sessionId,
              input: state.input
            }),
            error: null
          }
        } catch (error) {
          return {
            extraction: null,
            error: getErrorMessage(error)
          }
        }
      })
      .addEdge(START, 'extract_planning_logic')
      .addEdge('extract_planning_logic', END)
      .compile()

    const result = await graph.invoke(
      {
        sessionId: input.sessionId,
        input: input.input,
        extraction: null,
        error: null,
        extractor: input.extract
      },
      {
        recursionLimit: 4
      }
    )

    return {
      extraction: result.extraction,
      error: result.error
    }
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'AI extraction failed.'
}
