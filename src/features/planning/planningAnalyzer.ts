import { planningAnalysisSchema, type MissingField, type PlanningAnalysis } from './planningSchema'

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

  return planningAnalysisSchema.parse({
    rawText: normalizedText,
    personas,
    entities,
    actions,
    states,
    assumptions,
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
