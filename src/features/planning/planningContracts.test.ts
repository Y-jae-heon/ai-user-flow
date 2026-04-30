import { describe, expect, test } from 'vitest'
import { analyzePlanningInput } from './planningAnalyzer'
import { createMermaidDraft, generateMermaidFlow } from './mermaidGenerator'
import {
  apiFailureEnvelopeSchema,
  mermaidGenerationResponseSchema,
  planningInputSchema,
  planningSessionSnapshotSchema,
  planningStateTransitionSchema
} from './planningSchema'
import { createFailureEnvelope, createPlanningSessionSnapshot, createSuccessEnvelope, normalizePlanningSessionInput } from './planningContracts'

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

function createAnalysis() {
  return analyzePlanningInput(`
    주요 사용자: PM, 개발자, QA
    문제: Mermaid 렌더러와 AI 분석 결과가 동기화되지 않아 재작업이 발생한다.
    핵심 기능: 사용자가 MVP 메모를 입력하면 시스템이 분석 결과를 생성하고 공유한다.
    상태: 입력 완료, 분석 성공, 오류
  `)
}

describe('planning contract schemas', () => {
  test('keeps raw text input compatible while accepting nine planning elements', () => {
    expect(planningInputSchema.parse({ rawText: '사용자: PM\n문제: 재작업\n기능: 분석한다.' })).toEqual({
      rawText: '사용자: PM\n문제: 재작업\n기능: 분석한다.'
    })

    expect(
      planningInputSchema.parse({
        rawText: 'Structured backend contract input',
        elements: completeElements
      })
    ).toMatchObject({
      rawText: 'Structured backend contract input',
      elements: completeElements
    })
  })

  test('rejects unknown planning element keys at the API boundary', () => {
    expect(() =>
      planningInputSchema.parse({
        rawText: 'Structured backend contract input',
        elements: {
          ...completeElements,
          unsupportedElement: 'not allowed'
        }
      })
    ).toThrow()
  })

  test('normalizes planning session input without mutating the original payload', () => {
    const { exceptionCase: _droppedExceptionCase, ...expectedElements } = completeElements
    const input = {
      rawText: '  사용자: PM  ',
      elements: {
        ...completeElements,
        exceptionCase: '   ',
        exportNeed: '  Copy Mermaid code  '
      }
    }

    const normalized = normalizePlanningSessionInput(input)

    expect(normalized).toEqual({
      rawText: '사용자: PM',
      elements: {
        ...expectedElements,
        exportNeed: 'Copy Mermaid code'
      }
    })
    expect(input.rawText).toBe('  사용자: PM  ')
    expect(input.elements.exceptionCase).toBe('   ')
    expect(normalized).not.toBe(input)
    expect(normalized.elements).not.toBe(input.elements)
  })

  test('creates deterministic session snapshots from current analysis output', () => {
    const analysis = createAnalysis()
    const snapshot = createPlanningSessionSnapshot(
      {
        rawText: analysis.rawText,
        elements: completeElements
      },
      analysis
    )

    expect(snapshot.status).toBe('ready_for_generation')
    expect(snapshot.input.rawText).toBe(analysis.rawText)
    expect(snapshot.analysis).toEqual(analysis)
    expect(planningSessionSnapshotSchema.parse(snapshot)).toEqual(snapshot)
  })

  test('marks insufficient or blocking sessions as needing clarification', () => {
    const insufficientAnalysis = analyzePlanningInput('아이디어 앱')
    const blockingAnalysis = analyzePlanningInput(`
      사용자: 구매자
      문제: 로그인 없이 구매해야 하지만 회원 전용 혜택도 제공해야 한다.
      핵심 기능: 사용자가 상품을 선택하고 주문을 생성한다.
    `)

    expect(createPlanningSessionSnapshot({ rawText: '아이디어 앱' }, insufficientAnalysis).status).toBe(
      'needs_clarification'
    )
    expect(createPlanningSessionSnapshot({ rawText: blockingAnalysis.rawText }, blockingAnalysis).status).toBe(
      'needs_clarification'
    )
  })

  test('parses entity mapping, state machine, and validation report DTOs', () => {
    const analysis = createAnalysis()
    const snapshot = planningSessionSnapshotSchema.parse({
      id: 'session_contract_1',
      version: '2026-04-29',
      status: 'ready_for_generation',
      input: {
        rawText: analysis.rawText,
        elements: completeElements
      },
      analysis,
      dependencyAnalysis: [
        {
          from: 'targetUser',
          to: 'coreScenario',
          type: 'requires',
          rationale: 'A scenario must be owned by an actor.'
        }
      ],
      entities: {
        actors: [
          {
            id: 'actor_primary_user',
            name: 'Primary User',
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
        businessRules: [
          {
            id: 'rule_prompt_isolation',
            title: 'Prompt isolation',
            description: 'User text cannot override system instructions.',
            sourceElement: 'policyConstraint',
            severity: 'blocking'
          }
        ],
        exceptionPaths: [
          {
            id: 'exception_renderer_failure',
            title: 'Renderer validation failure',
            trigger: 'Mermaid parser rejects generated code.',
            expectedBehavior: 'System retries correction and returns fallback code if exhausted.',
            recoveryAction: 'Retry correction or ask the user to revise input.',
            riskLevel: 'high'
          }
        ]
      },
      stateMachine: {
        initialState: 'input_received',
        states: [
          { id: 'input_received', label: 'Input received' },
          { id: 'validating_output', label: 'Validating output' },
          { id: 'ready', label: 'Ready', isTerminal: true }
        ],
        transitions: [
          {
            from: 'input_received',
            to: 'validating_output',
            condition: 'minimum_fields_present'
          },
          {
            from: 'validating_output',
            to: 'ready',
            condition: 'validation_passed'
          }
        ]
      },
      validation: {
        jsonSchema: 'passed',
        mermaidSyntax: 'passed',
        cycleCheck: 'passed',
        promptInjectionCheck: 'passed',
        retryCount: 0,
        errors: []
      },
      flowDraft: null,
      mermaidDocument: null
    })

    expect(snapshot.entities.actors[0]?.id).toBe('actor_primary_user')
    expect(snapshot.stateMachine?.transitions).toHaveLength(2)
    expect(snapshot.validation?.jsonSchema).toBe('passed')
  })

  test('rejects invalid state transitions with empty fields', () => {
    expect(() =>
      planningStateTransitionSchema.parse({
        from: '',
        to: 'ready',
        condition: 'validation_passed'
      })
    ).toThrow()
    expect(() =>
      planningStateTransitionSchema.parse({
        from: 'validating_output',
        to: '',
        condition: 'validation_passed'
      })
    ).toThrow()
    expect(() =>
      planningStateTransitionSchema.parse({
        from: 'validating_output',
        to: 'ready',
        condition: ''
      })
    ).toThrow()
  })

  test('embeds the updated session snapshot in generation response envelopes', () => {
    const analysis = createAnalysis()
    const draft = createMermaidDraft({ analysis, suggestions: analysis.suggestions })
    const mermaidDocument = generateMermaidFlow({ analysis, suggestions: analysis.suggestions })
    const snapshot = createPlanningSessionSnapshot({ rawText: analysis.rawText }, analysis)
    const response = createSuccessEnvelope({
      ...snapshot,
      status: 'ready',
      flowDraft: draft,
      mermaidDocument,
      validation: {
        jsonSchema: 'passed',
        mermaidSyntax: 'passed',
        cycleCheck: 'passed',
        promptInjectionCheck: 'passed',
        retryCount: 0,
        errors: []
      }
    })

    expect(mermaidGenerationResponseSchema.parse(response)).toEqual(response)
  })

  test('creates failure envelopes with stable machine-readable error codes', () => {
    const response = createFailureEnvelope({
      code: 'VALIDATION_FAILED',
      message: 'Planning input could not be validated.',
      retryable: true,
      details: { field: 'rawText' }
    })

    expect(response).toEqual({
      success: false,
      data: null,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Planning input could not be validated.',
        retryable: true,
        details: { field: 'rawText' }
      }
    })
    expect(apiFailureEnvelopeSchema.parse(response)).toEqual(response)
  })
})
