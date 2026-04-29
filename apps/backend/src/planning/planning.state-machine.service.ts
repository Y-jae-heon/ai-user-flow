import { Injectable } from '@nestjs/common'
import {
  planningStateMachineSchema,
  type PlanningSessionSnapshot,
  type PlanningStateMachine
} from './dto/planning.dto'

@Injectable()
export class PlanningStateMachineService {
  buildStateMachine(snapshot: PlanningSessionSnapshot): PlanningStateMachine {
    const hasBlockingContradiction =
      snapshot.analysis?.contradictions.some((contradiction) => contradiction.severity === 'blocking') ?? false
    const needsClarification =
      snapshot.status === 'needs_clarification' ||
      snapshot.analysis?.completeness.isSufficient === false ||
      hasBlockingContradiction ||
      snapshot.validation?.promptInjectionCheck === 'failed'

    return planningStateMachineSchema.parse({
      initialState: 'input_received',
      states: [
        {
          id: 'input_received',
          label: 'Input received',
          description: 'Backend accepted planning text and structured elements.'
        },
        {
          id: 'parsing',
          label: 'Parsing planning logic',
          description: 'Actors, objects, actions, rules, states, and dependencies are extracted.'
        },
        {
          id: 'needs_clarification',
          label: 'Needs clarification',
          description: 'Input is incomplete, contradictory, or unsafe.'
        },
        {
          id: 'mapping_logic',
          label: 'Mapping logic',
          description: 'Extracted units are mapped to session-scoped backend entities.'
        },
        {
          id: 'generating_mermaid',
          label: 'Generating Mermaid',
          description: 'Typed flow draft and Mermaid code are generated.'
        },
        {
          id: 'validating_output',
          label: 'Validating output',
          description: 'JSON, graph, safety, and parser validation run.'
        },
        {
          id: 'self_correcting',
          label: 'Self correcting',
          description: 'One bounded deterministic correction pass is available.'
        },
        {
          id: 'ready',
          label: 'Ready',
          description: 'Validated Mermaid and structured flow data are available.',
          isTerminal: true
        },
        {
          id: 'failed',
          label: 'Failed',
          description: 'Workflow ended with unrecoverable validation or generation failure.',
          isTerminal: true
        }
      ],
      transitions: [
        {
          from: 'input_received',
          to: 'parsing',
          condition: 'minimum_fields_present'
        },
        {
          from: 'parsing',
          to: needsClarification ? 'needs_clarification' : 'mapping_logic',
          condition: needsClarification ? 'blocking_issue_found' : 'analysis_ready'
        },
        {
          from: 'needs_clarification',
          to: 'input_received',
          condition: 'user_revises_planning_input',
          isRetry: true
        },
        {
          from: 'mapping_logic',
          to: 'generating_mermaid',
          condition: 'entities_and_transitions_ready'
        },
        {
          from: 'generating_mermaid',
          to: 'validating_output',
          condition: 'flow_draft_serialized'
        },
        {
          from: 'validating_output',
          to: 'ready',
          condition: 'validation_passed'
        },
        {
          from: 'validating_output',
          to: 'self_correcting',
          condition: 'mermaid_parse_failed_and_retry_available'
        },
        {
          from: 'self_correcting',
          to: 'validating_output',
          condition: 'deterministic_correction_applied',
          isRetry: true
        },
        {
          from: 'self_correcting',
          to: 'failed',
          condition: 'retry_limit_exceeded'
        }
      ]
    })
  }
}
