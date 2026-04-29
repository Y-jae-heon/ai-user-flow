import {
  planningAnalysisSchema as frontendPlanningAnalysisSchema,
  planningEntityMappingSchema as frontendPlanningEntityMappingSchema,
  planningInputSchema as frontendPlanningInputSchema
} from '../../../../../src/features/planning/planningSchema'
import {
  mermaidGenerationRequestSchema,
  mermaidGenerationResponseSchema,
  planningAnalysisSchema,
  planningAuditEventSchema,
  planningEntityMappingSchema,
  planningExtractionResultSchema,
  planningIdempotencyRecordSchema,
  planningInputSchema,
  planningSessionSnapshotSchema,
  storedPlanningSessionSchema
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

  it('accepts Mermaid generation requests and responses with frontend-compatible flow data', () => {
    const session = planningSessionSnapshotSchema.parse({
      id: 'session_test',
      version: '2026-04-29',
      status: 'ready_for_generation',
      input: {
        rawText: 'Structured backend contract input',
        elements: completeElements
      },
      analysis: {
        rawText: 'Structured backend contract input',
        personas: ['Product planner'],
        entities: ['Planning Session'],
        actions: ['Generate Mermaid'],
        states: ['ready_for_generation'],
        assumptions: [],
        suggestions: [],
        contradictions: [],
        completeness: {
          isSufficient: true,
          score: 100,
          missingFields: [],
          guidance: []
        }
      },
      dependencyAnalysis: [],
      entities: {
        actors: [
          {
            id: 'actor_primary_user',
            name: 'Product planner',
            sourceElement: 'targetUser',
            confidence: 'high'
          }
        ],
        objects: [],
        actions: [],
        businessRules: [],
        exceptionPaths: []
      },
      stateMachine: null,
      validation: {
        jsonSchema: 'passed',
        mermaidSyntax: 'skipped',
        cycleCheck: 'skipped',
        promptInjectionCheck: 'passed',
        retryCount: 0,
        errors: []
      },
      flowDraft: null,
      mermaidDocument: null
    })
    const flowDraft = {
      nodes: [
        {
          id: 'start',
          sectionId: null,
          label: 'Start',
          shape: 'terminal',
          editable: false
        },
        {
          id: 'preview',
          sectionId: 'output_group',
          label: 'Preview',
          shape: 'rectangle',
          editable: true
        }
      ],
      edges: [{ from: 'start', to: 'preview', label: null }],
      sections: [{ id: 'output_group', label: 'Output' }],
      isHappyPathBiased: false
    }

    expect(mermaidGenerationRequestSchema.parse({ session }).session?.id).toBe('session_test')
    expect(() =>
      mermaidGenerationResponseSchema.parse({
        flowDraft,
        mermaidDocument: {
          code: 'flowchart TD\n  start([Start]) --> preview["Preview"]',
          renderStatus: 'generated',
          retryCount: 0,
          renderError: null,
          svg: null,
          isHappyPathBiased: false,
          blockedReason: null
        },
        validation: {
          jsonSchema: 'passed',
          mermaidSyntax: 'passed',
          cycleCheck: 'passed',
          promptInjectionCheck: 'passed',
          retryCount: 0,
          errors: []
        }
      })
    ).not.toThrow()
  })

  it('rejects unsafe state-machine ids before graph validation', () => {
    expect(() =>
      planningSessionSnapshotSchema.parse({
        id: 'session_test',
        version: '2026-04-29',
        status: 'ready_for_generation',
        input: {
          rawText: 'Structured backend contract input'
        },
        analysis: null,
        dependencyAnalysis: [],
        entities: {
          actors: [],
          objects: [],
          actions: [],
          businessRules: [],
          exceptionPaths: []
        },
        stateMachine: {
          initialState: 'Invalid State',
          states: [{ id: 'Invalid State', label: 'Invalid', isTerminal: true }],
          transitions: []
        },
        validation: null,
        flowDraft: null,
        mermaidDocument: null
      })
    ).toThrow()
  })

  it('validates strict persistence records', () => {
    const session = planningSessionSnapshotSchema.parse({
      id: 'session_test',
      version: '2026-04-29',
      status: 'input_received',
      input: {
        rawText: '사용자: PM\n문제: 재작업\n기능: 분석'
      },
      analysis: null,
      dependencyAnalysis: [],
      entities: {
        actors: [],
        objects: [],
        actions: [],
        businessRules: [],
        exceptionPaths: []
      },
      stateMachine: null,
      validation: null,
      flowDraft: null,
      mermaidDocument: null
    })

    expect(
      storedPlanningSessionSchema.parse({
        schemaVersion: '2026-04-29',
        savedAt: '2026-04-30T00:00:00.000Z',
        expiresAt: '2026-05-01T00:00:00.000Z',
        session
      }).session.id
    ).toBe('session_test')
    expect(() =>
      storedPlanningSessionSchema.parse({
        schemaVersion: '2026-04-29',
        savedAt: '2026-04-30T00:00:00.000Z',
        expiresAt: '2026-05-01T00:00:00.000Z',
        session,
        extra: true
      })
    ).toThrow()
  })

  it('validates bounded audit and idempotency records', () => {
    expect(() =>
      planningAuditEventSchema.parse({
        eventId: 'event_1',
        sessionId: 'session_test',
        type: 'analysis_completed',
        createdAt: '2026-04-30T00:00:00.000Z',
        status: 'success',
        summary: 'Analysis completed.',
        validation: null,
        retryCount: null,
        modelMetadata: {
          provider: 'openai',
          model: 'gpt-test',
          usedFallback: false
        }
      })
    ).not.toThrow()

    expect(() =>
      planningIdempotencyRecordSchema.parse({
        schemaVersion: '2026-04-29',
        key: 'client-key',
        scope: 'POST:/api/planning-sessions/session_test/analyze',
        requestHash: 'a'.repeat(64),
        status: 'completed',
        createdAt: '2026-04-30T00:00:00.000Z',
        expiresAt: '2026-04-30T01:00:00.000Z',
        response: {
          success: true
        }
      })
    ).not.toThrow()

    expect(() =>
      planningAuditEventSchema.parse({
        eventId: 'event_1',
        sessionId: 'session_test',
        type: 'unknown',
        createdAt: '2026-04-30T00:00:00.000Z',
        status: 'success',
        summary: 'x',
        validation: null,
        retryCount: null,
        modelMetadata: null
      })
    ).toThrow()
  })
})
