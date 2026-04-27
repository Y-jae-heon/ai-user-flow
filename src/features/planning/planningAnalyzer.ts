import {
  planningAnalysisSchema,
  type Contradiction,
  type LogicGapCategory,
  type LogicGapSuggestion,
  type MissingField,
  type PlanningAnalysis
} from './planningSchema'

const MINIMUM_CHARACTER_COUNT = 40
const MAX_ITEMS_PER_GROUP = 8

const PERSONA_KEYWORDS = [
  '사용자',
  '페르소나',
  'persona',
  'customer',
  'actor',
  'founder',
  'developer',
  'planner',
  'pm',
  'po',
  'qa',
  '기획자',
  '개발자',
  '창업가'
]

const PROBLEM_KEYWORDS = ['문제', 'pain', 'problem', '해결', '불편', '낭비', 'rework', '재작업']
const ACTION_SECTION_KEYWORDS = ['핵심 기능', '시나리오', 'action', 'flow', '기능', '입력', '생성', '출력', '수정', '내보내']
const STATE_KEYWORDS = ['pending', 'success', 'fail', 'error', '승인', '거절', '완료', '실패', '보류', '취소', '오류']
const ENTITY_KEYWORDS = ['시스템', 'db', 'database', 'session', '문서', 'renderer', '데이터', 'ai', 'mermaid']

const GUIDANCE_BY_FIELD: Record<MissingField, string> = {
  user: '주요 사용자가 누구인지 최소 1개 이상 적어주세요.',
  problem: '사용자가 겪는 문제나 현재 대안의 한계를 적어주세요.',
  actions: '사용자가 수행하는 핵심 액션이나 주요 시나리오를 적어주세요.'
}

export function analyzePlanningInput(rawText: string): PlanningAnalysis {
  const normalizedText = normalizeText(rawText)
  const lines = tokenizeLines(normalizedText)

  const personas = uniqueLimited(extractPersonas(lines))
  const problemSignals = extractByKeywords(lines, PROBLEM_KEYWORDS)
  const actions = uniqueLimited(extractActions(lines))
  const states = uniqueLimited(extractByKeywords(lines, STATE_KEYWORDS))
  const entities = uniqueLimited(extractEntities(lines))
  const missingFields = getMissingFields(normalizedText, personas, problemSignals, actions)
  const guidance = missingFields.map((field) => GUIDANCE_BY_FIELD[field])
  const completeness = {
    isSufficient: missingFields.length === 0,
    score: calculateScore(normalizedText, missingFields),
    missingFields,
    guidance
  }
  const assumptions = buildAssumptions(normalizedText, states, entities)
  const suggestions = completeness.isSufficient
    ? generateLogicGapSuggestions({ normalizedText, actions, states, entities })
    : []
  const contradictions = completeness.isSufficient ? detectContradictions(normalizedText) : []

  return planningAnalysisSchema.parse({
    rawText: normalizedText,
    personas,
    entities,
    actions,
    states,
    assumptions,
    suggestions,
    contradictions,
    completeness
  })
}

function normalizeText(rawText: string): string {
  return rawText.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim()
}

function tokenizeLines(text: string): string[] {
  if (!text) {
    return []
  }

  return text
    .split(/\n|(?<=[.!?。])\s+/)
    .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean)
}

function extractByKeywords(lines: readonly string[], keywords: readonly string[]): string[] {
  return lines.filter((line) => includesAny(line, keywords)).map(cleanLabel)
}

function extractPersonas(lines: readonly string[]): string[] {
  return lines
    .filter((line) => {
      const normalizedLine = line.toLowerCase()
      const hasPersonaHeading = /^(주요\s*)?(사용자|페르소나|persona|customer|actor|대상)\s*[:：]/i.test(line)
      const hasRoleKeyword = /\b(pm|po|qa|founder|developer|planner)\b/i.test(normalizedLine)
      const hasKoreanRoleKeyword = /(기획자|개발자|창업가|제품\s*팀)/.test(line)

      return hasPersonaHeading || hasRoleKeyword || hasKoreanRoleKeyword
    })
    .map(cleanLabel)
}

function extractActions(lines: readonly string[]): string[] {
  const candidates = lines.filter((line) => {
    const lowerLine = line.toLowerCase()
    const isStateHeading = /^(상태|status|state)\s*[:：]/i.test(line)

    return (
      !isStateHeading &&
      (includesAny(lowerLine, ACTION_SECTION_KEYWORDS) ||
        /(입력|생성|출력|수정|검토|수락|거절|복사|내보내|분석|추천|공유|export|copy|review|accept|reject|generate)/i.test(line))
    )
  })

  return candidates.map(cleanLabel)
}

function extractEntities(lines: readonly string[]): string[] {
  const explicitEntities = lines
    .filter((line) => !/^(주요\s*)?(사용자|페르소나|persona|customer|actor|대상)\s*[:：]/i.test(line))
    .filter((line) => includesAny(line, ENTITY_KEYWORDS))
    .map(cleanLabel)

  return explicitEntities
}

function getMissingFields(
  normalizedText: string,
  personas: readonly string[],
  problemSignals: readonly string[],
  actions: readonly string[]
): MissingField[] {
  const missingFields: MissingField[] = []

  if (normalizedText.length < MINIMUM_CHARACTER_COUNT || personas.length === 0) {
    missingFields.push('user')
  }

  if (normalizedText.length < MINIMUM_CHARACTER_COUNT || problemSignals.length === 0) {
    missingFields.push('problem')
  }

  if (normalizedText.length < MINIMUM_CHARACTER_COUNT || actions.length === 0) {
    missingFields.push('actions')
  }

  return missingFields
}

function calculateScore(normalizedText: string, missingFields: readonly MissingField[]): number {
  const presentFieldCount = 3 - missingFields.length
  const fieldScore = presentFieldCount * 30
  const lengthScore = normalizedText.length >= MINIMUM_CHARACTER_COUNT ? 10 : 0

  return fieldScore + lengthScore
}

function buildAssumptions(normalizedText: string, states: readonly string[], entities: readonly string[]): string[] {
  const assumptions: string[] = []

  if (normalizedText && states.length === 0) {
    assumptions.push('명시적인 상태 전이가 부족해 Phase 1에서는 후보 상태를 제한적으로 추출했습니다.')
  }

  if (normalizedText && entities.length === 0) {
    assumptions.push('시스템이나 데이터 저장소가 명시되지 않아 사용자 중심 엔티티만 추정할 수 있습니다.')
  }

  return assumptions
}

interface SuggestionContext {
  normalizedText: string
  actions: readonly string[]
  states: readonly string[]
  entities: readonly string[]
}

interface SuggestionTemplate {
  id: string
  category: LogicGapCategory
  title: string
  description: string
  rationale: string
  keywords: readonly string[]
}

const BASE_SUGGESTIONS: readonly SuggestionTemplate[] = [
  {
    id: 'edge-onboarding-exit',
    category: 'onboarding',
    title: 'Onboarding abandonment',
    description: '사용자가 입력 도중 이탈하거나 최소 정보를 끝까지 채우지 않는 경로를 정의합니다.',
    rationale: '초기 기획 메모는 정상 입력만 가정하기 쉬워 이탈 후 재진입 상태가 누락됩니다.',
    keywords: []
  },
  {
    id: 'edge-permission-auth-failure',
    category: 'permission',
    title: 'Permission or auth failure',
    description: '권한 부족, 로그인 실패, 세션 만료가 발생했을 때 차단 메시지와 복구 액션을 정의합니다.',
    rationale: '사용자별 접근 조건이 명확하지 않으면 개발 단계에서 인증 정책이 흔들립니다.',
    keywords: []
  },
  {
    id: 'edge-export-handoff-failure',
    category: 'export',
    title: 'Export or handoff failure',
    description: '복사, 다운로드, 외부 문서 첨부가 실패했을 때 대체 경로를 제공합니다.',
    rationale: '산출물을 공유하는 제품은 내보내기 실패가 곧 핵심 가치 실패로 이어집니다.',
    keywords: []
  }
]

const DOMAIN_SUGGESTIONS: readonly SuggestionTemplate[] = [
  {
    id: 'edge-data-sync-failure',
    category: 'data',
    title: 'Data sync failure',
    description: '외부 시스템, DB, 렌더러, AI 응답이 지연되거나 실패할 때 재시도와 임시 저장 상태를 정의합니다.',
    rationale: '분석형 도구는 중간 처리 결과와 최종 결과가 어긋나는 동기화 문제가 자주 발생합니다.',
    keywords: ['db', 'database', '데이터', '동기화', 'renderer', '렌더', 'ai', 'mermaid', '시스템']
  },
  {
    id: 'edge-payment-cancel-refund',
    category: 'fallback',
    title: 'Payment cancellation or refund',
    description: '결제 취소, 환불, 구독 실패 시 권한과 산출물 접근 상태를 정의합니다.',
    rationale: '금전 흐름이 있는 서비스는 결제 실패 후 기능 접근 범위가 명확해야 합니다.',
    keywords: ['결제', '구독', '환불', '취소', 'payment', 'billing', 'refund']
  },
  {
    id: 'edge-multi-persona-notification',
    category: 'quality',
    title: 'Multi-persona notification gap',
    description: 'PM, 개발자, QA 등 여러 이해관계자에게 상태 변경과 승인 필요 여부를 어떻게 알릴지 정의합니다.',
    rationale: '다수 페르소나가 같은 플로우를 검토하면 알림 누락이 승인 지연과 재작업으로 이어집니다.',
    keywords: ['pm', 'po', 'qa', '개발자', '기획자', '팀', '승인', '알림', '공유']
  }
]

function generateLogicGapSuggestions(context: SuggestionContext): LogicGapSuggestion[] {
  const searchableText = [context.normalizedText, ...context.actions, ...context.states, ...context.entities].join(' ')
  const matchedDomainSuggestions = DOMAIN_SUGGESTIONS.filter((template) => includesAny(searchableText, template.keywords))
  const templates = uniqueTemplates([...matchedDomainSuggestions, ...BASE_SUGGESTIONS]).slice(0, 6)

  return templates.map((template) => ({
    id: template.id,
    category: template.category,
    title: template.title,
    description: template.description,
    rationale: template.rationale,
    status: 'pending'
  }))
}

interface ContradictionRule {
  id: string
  title: string
  description: string
  leftSignals: readonly string[]
  rightSignals: readonly string[]
  resolutionPrompt: string
}

const CONTRADICTION_RULES: readonly ContradictionRule[] = [
  {
    id: 'conflict-auth-required-vs-guest',
    title: 'Guest purchase conflicts with member-only benefit',
    description: '로그인 없이 구매할 수 있다는 조건과 회원 전용 혜택 조건이 함께 있어 적용 기준이 충돌합니다.',
    leftSignals: ['로그인 없이 구매', '비회원 구매', 'guest purchase', 'without login'],
    rightSignals: ['회원 전용 혜택', '회원 전용', 'member only', 'members only'],
    resolutionPrompt: '비회원 구매를 허용할지, 회원 전용 혜택을 우선할지 선택하세요.'
  },
  {
    id: 'conflict-free-vs-required-payment',
    title: 'Free usage conflicts with required payment',
    description: '무료 사용 조건과 결제 또는 구독 필수 조건이 함께 있어 과금 정책이 충돌합니다.',
    leftSignals: ['무료', 'free'],
    rightSignals: ['결제 필수', '구독 필수', 'payment required', 'subscription required'],
    resolutionPrompt: '무료 범위와 결제 또는 구독이 필요한 시점을 분리해 정의하세요.'
  },
  {
    id: 'conflict-anonymous-vs-real-name',
    title: 'Anonymous flow conflicts with real-name verification',
    description: '익명 사용 조건과 실명 인증 필수 조건이 함께 있어 신원 확인 정책이 충돌합니다.',
    leftSignals: ['익명', 'anonymous'],
    rightSignals: ['실명 인증 필수', '실명 인증', 'real-name verification', 'identity verification'],
    resolutionPrompt: '익명 사용 가능 단계와 실명 인증이 필요한 단계를 분리하세요.'
  }
]

function detectContradictions(normalizedText: string): Contradiction[] {
  return CONTRADICTION_RULES.filter((rule) => {
    return includesAny(normalizedText, rule.leftSignals) && includesAny(normalizedText, rule.rightSignals)
  }).map((rule) => ({
    id: rule.id,
    severity: 'blocking',
    title: rule.title,
    description: rule.description,
    signals: [...rule.leftSignals.slice(0, 1), ...rule.rightSignals.slice(0, 1)],
    resolutionPrompt: rule.resolutionPrompt
  }))
}

function uniqueTemplates(templates: readonly SuggestionTemplate[]): SuggestionTemplate[] {
  const seenIds = new Set<string>()

  return templates.filter((template) => {
    if (seenIds.has(template.id)) {
      return false
    }

    seenIds.add(template.id)
    return true
  })
}

function includesAny(value: string, keywords: readonly string[]): boolean {
  const lowerValue = value.toLowerCase()
  return keywords.some((keyword) => lowerValue.includes(keyword.toLowerCase()))
}

function cleanLabel(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/^[가-힣A-Za-z ]+[:：]\s*/, '').trim()
}

function uniqueLimited(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).slice(0, MAX_ITEMS_PER_GROUP)
}
