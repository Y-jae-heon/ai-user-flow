import {
  planningAnalysisSchema as frontendPlanningAnalysisSchema,
  planningEntityMappingSchema as frontendPlanningEntityMappingSchema,
  planningInputSchema as frontendPlanningInputSchema
} from '../../../../../src/features/planning/planningSchema'
import {
  planningAnalysisSchema,
  planningEntityMappingSchema,
  planningExtractionResultSchema,
  planningInputSchema
} from './planning.dto'

const completeElements = {
  mvpDefinition: 'AI planning assistant',
  targetUser: 'Product planner',
  problem: 'Incomplete user flows create downstream rework.',
  coreScenario: 'Planner submits rough MVP notes and reviews generated logic gaps.',
  successResult: 'Planner receives validated Mermaid code.',
  dataDependency: 'Session cache and renderer validation result',
  exceptionCase: 'Renderer validation fails and needs correction.',
  policyConstraint: 'User input must not override system instructions.',
  exportNeed: 'Copy Mermaid code and export SVG.'
}

describe('planning DTO compatibility', () => {
  it('accepts the same planning input shape as the frontend contract', () => {
    const input = {
      rawText: 'Structured backend contract input',
      elements: completeElements
    }

    expect(planningInputSchema.parse(input)).toEqual(frontendPlanningInputSchema.parse(input))
  })

  it('rejects unknown planning element keys like the frontend contract', () => {
    const input = {
      rawText: 'Structured backend contract input',
      elements: {
        ...completeElements,
        unsupportedElement: 'not allowed'
      }
    }

    expect(() => planningInputSchema.parse(input)).toThrow()
    expect(() => frontendPlanningInputSchema.parse(input)).toThrow()
  })

  it('accepts strict analysis and entity mapping payloads compatible with the frontend contract', () => {
    const analysis = {
      rawText: '사용자: PM\n문제: 재작업\n기능: 분석 결과 생성',
      personas: ['PM'],
      entities: ['Planning Session'],
      actions: ['Generate analysis'],
      states: ['input_received'],
      assumptions: [
        {
          id: 'assumption_missing_state',
          confidence: 'medium',
          statement: 'State transitions need review.',
          followUpPrompt: 'Confirm the primary terminal states.'
        }
      ],
      suggestions: [
        {
          id: 'suggestion_recovery_path',
          category: 'fallback',
          title: 'Recovery path review',
          description: 'Define recovery behavior.',
          rationale: 'Fallback paths reduce failed handoffs.',
          qaHandoff: {
            scenario: 'Renderer fails',
            precondition: 'Mermaid code exists',
            trigger: 'Parser returns an error',
            expectedBehavior: 'System returns retry guidance',
            riskLevel: 'medium'
          },
          status: 'pending'
        }
      ],
      contradictions: [],
      completeness: {
        isSufficient: true,
        score: 100,
        missingFields: [],
        guidance: []
      }
    }
    const entities = {
      actors: [
        {
          id: 'actor_primary_user',
          name: 'PM',
          sourceElement: 'targetUser',
          confidence: 'high'
        }
      ],
      objects: [
        {
          id: 'object_planning_session',
          name: 'Planning Session',
          storageTarget: 'planning_sessions',
          confidence: 'high'
        }
      ],
      actions: [
        {
          id: 'action_submit_input',
          actorId: 'actor_primary_user',
          objectId: 'object_planning_session',
          verb: 'submit',
          preconditions: ['session_available'],
          postconditions: ['input_received']
        }
      ],
      businessRules: [],
      exceptionPaths: []
    }

    expect(planningAnalysisSchema.parse(analysis)).toEqual(frontendPlanningAnalysisSchema.parse(analysis))
    expect(planningEntityMappingSchema.parse(entities)).toEqual(frontendPlanningEntityMappingSchema.parse(entities))
    expect(() =>
      planningExtractionResultSchema.parse({
        analysis,
        dependencyAnalysis: [
          {
            from: 'targetUser',
            to: 'coreScenario',
            type: 'requires',
            rationale: 'A scenario must be owned by an actor.'
          }
        ],
        entities,
        statusRecommendation: 'ready_for_generation',
        blockingReasons: [],
        modelMetadata: {
          provider: 'openai',
          model: 'gpt-5.2-chat-latest',
          usedFallback: false
        }
      })
    ).not.toThrow()
  })

  it('rejects invalid generated ids before extracted data reaches Mermaid generation', () => {
    expect(() =>
      planningEntityMappingSchema.parse({
        actors: [
          {
            id: 'Actor Invalid',
            name: 'PM',
            sourceElement: 'targetUser',
            confidence: 'high'
          }
        ],
        objects: [],
        actions: [],
        businessRules: [],
        exceptionPaths: []
      })
    ).toThrow()
  })
})
