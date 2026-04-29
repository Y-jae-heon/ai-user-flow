# AI User Flow Planner

불완전한 MVP/제품 기획 텍스트를 분석해 누락된 비즈니스 로직, 예외 경로, 상충 요구사항을 찾아내고 개발·리뷰 가능한 Mermaid 사용자 흐름으로 변환하는 AI 플래닝 도구입니다.

## 프로젝트 개요

AI User Flow Planner는 초기 창업가, PM/PO, 개발자, QA가 거친 기획 메모를 더 검증 가능한 사용자 플로우로 정리하도록 돕습니다. 현재 MVP는 브라우저에서 동작하는 React/Vite 앱이며, 별도 백엔드나 외부 LLM API 없이 로컬 규칙 기반 분석과 Mermaid 렌더링을 수행합니다.

주요 기능:

- MVP 기획 텍스트 입력 및 최소 정보 검증
- 페르소나, 엔티티, 액션, 상태 후보 추출
- 누락 가능성이 높은 예외 경로 추천
- 상충 요구사항 감지 및 Mermaid 생성 차단
- 제안별 accept/reject 리뷰
- confidence label이 포함된 assumptions 표시
- QA handoff용 테스트 시나리오 표시
- Mermaid flowchart 코드 생성 및 공식 Mermaid 렌더링 검증
- 렌더링 실패 시 1회 self-correction 후 fallback 표시
- 노드 라벨 수정 및 Mermaid 재렌더링
- Mermaid 코드 복사, SVG/PNG 내보내기

## 기술 스택

- React
- TypeScript
- Vite
- Mermaid
- Zod
- Vitest
- Testing Library

## 요구사항

- Node.js와 npm이 설치되어 있어야 합니다.
- 현재 저장소는 `package-lock.json`을 포함하므로 npm 사용을 기준으로 합니다.
- 현재 별도 `.env` 파일이나 API 키는 필요하지 않습니다.

## 설치 및 실행

```bash
npm install
npm run dev
```

개발 서버가 실행되면 터미널에 표시되는 로컬 URL로 접속합니다. 일반적으로 Vite는 `http://localhost:5173`을 사용합니다.

프로덕션 빌드 확인:

```bash
npm run build
npm run preview
```

## 명령어

<!-- AUTO-GENERATED: package-scripts -->
| 명령어 | 설명 |
|---|---|
| `npm run dev` | Vite 개발 서버를 실행합니다. |
| `npm run build` | TypeScript 프로젝트 빌드 후 Vite 프로덕션 번들을 생성합니다. |
| `npm run preview` | 생성된 프로덕션 빌드를 로컬에서 미리 봅니다. |
| `npm run test` | Vitest를 watch 모드로 실행합니다. |
| `npm run test:run` | Vitest 전체 테스트를 단발 실행합니다. |
| `npm run coverage` | Vitest 테스트와 V8 커버리지 리포트를 생성합니다. |
| `npm run typecheck` | TypeScript 빌드 모드로 타입 검사를 실행합니다. |
<!-- /AUTO-GENERATED: package-scripts -->

## 사용자 매뉴얼

### 1. MVP 기획 텍스트 입력

왼쪽 `MVP notes` 패널에 기획 메모를 붙여넣습니다. 최소한 아래 정보가 포함되어야 분석 품질이 안정적입니다.

- 주요 사용자 또는 페르소나
- 사용자가 겪는 문제
- 핵심 기능 또는 주요 시나리오

예시:

```text
주요 사용자: PM, 개발자, QA
문제: 텍스트 기획서가 사람마다 다르게 해석되어 개발 재작업이 발생한다.
핵심 기능: 사용자가 MVP 메모를 입력하면 시스템이 누락 로직을 분석하고 Mermaid 플로우를 생성한다.
상태: 입력 완료, 분석 성공, 렌더링 실패
```

### 2. Readiness check 확인

`Analyze`를 누르면 오른쪽 패널에 분석 결과가 표시됩니다.

- `분석 가능한 입력입니다`: Mermaid 생성 단계로 진행할 수 있습니다.
- `최소 정보가 부족합니다`: 부족한 항목에 대한 guidance를 확인하고 입력을 보완해야 합니다.
- `Contradictions`: 상충 요구사항이 감지된 상태입니다. blocking contradiction이 있으면 Mermaid 생성이 차단됩니다.

### 3. Logic gap suggestions 리뷰

시스템은 누락되기 쉬운 예외 경로를 추천합니다. 각 제안은 `pending`, `accepted`, `rejected` 상태를 가집니다.

- `Accept`: Mermaid 예외 경로에 반영합니다.
- `Reject`: Mermaid에는 반영하지 않지만 audit visibility를 위해 목록에 남깁니다.
- 모든 제안을 거절하면 happy-path bias 경고가 표시됩니다.

### 4. Confidence와 QA handoff 확인

분석 패널의 `Assumptions`는 시스템이 추정한 부분을 confidence와 함께 보여줍니다.

- `high confidence`: 비교적 명확한 추정
- `medium confidence`: 보완하면 좋은 추정
- `low confidence`: 요구사항 명시가 필요한 추정

`QA handoff`는 제안된 예외 경로를 테스트 케이스 형태로 정리합니다.

- Accepted candidate tests
- Rejected audit exclusions
- Pending QA review

각 항목은 scenario, precondition, trigger, expected behavior, risk level을 포함합니다.

### 5. Mermaid 생성 및 검증

`Generate Mermaid`를 누르면 Mermaid flowchart 코드가 생성되고 공식 Mermaid 렌더러로 preview를 검증합니다.

렌더링 상태:

- `idle`: 아직 생성 전
- `rendering`: Mermaid 렌더링 중
- `rendered`: 렌더링 성공
- `fallback`: self-correction 이후에도 렌더링 실패
- `blocked`: blocking contradiction 등으로 생성 차단

렌더링 실패 시 시스템은 Mermaid 문법을 1회 보정하고 다시 렌더링합니다. 실패가 계속되면 fallback 상태와 원문 코드를 표시합니다.

### 6. 노드 라벨 수정

Mermaid 생성 후 `Refine nodes`에서 editable node의 라벨을 수정할 수 있습니다. 수정 시 Mermaid 코드와 preview가 다시 생성됩니다.

### 7. 복사 및 내보내기

Mermaid 생성 후 다음 작업을 사용할 수 있습니다.

- `Copy Mermaid`: Mermaid 코드를 클립보드에 복사합니다.
- `Export SVG`: 렌더링된 다이어그램을 SVG로 다운로드합니다.
- `Export PNG`: 렌더링된 다이어그램을 PNG로 다운로드합니다.

내보내기 실패 시 Mermaid 코드는 유지되며, 다른 내보내기 방식을 다시 시도할 수 있습니다.

## 개발자 가이드

주요 소스 위치:

```text
src/
├── App.tsx
├── main.tsx
├── styles.css
└── features/
    └── planning/
        ├── PlanningWorkspace.tsx
        ├── planningAnalyzer.ts
        ├── planningSchema.ts
        ├── mermaidGenerator.ts
        ├── mermaidRenderer.ts
        ├── mermaidExport.ts
        └── components/
            ├── InputPanel.tsx
            ├── AnalysisPanel.tsx
            └── MermaidOutputPanel.tsx
```

핵심 흐름:

1. `InputPanel`이 raw MVP text를 입력받습니다.
2. `PlanningWorkspace`가 `analyzePlanningInput`을 호출해 structured analysis를 만듭니다.
3. `AnalysisPanel`이 completeness, contradiction, suggestions, assumptions, QA handoff를 표시합니다.
4. `mermaidGenerator`가 accepted suggestions를 Mermaid draft/code로 변환합니다.
5. `mermaidRenderer`가 공식 Mermaid `parse`/`render`로 preview를 검증합니다.
6. `MermaidOutputPanel`이 코드, preview, node refinement, export actions를 제공합니다.
7. `mermaidExport`가 clipboard, SVG, PNG export를 처리합니다.

## 테스트 및 검증

일상 개발 중 권장 검증:

```bash
npm run typecheck
npm run test:run
npm run build
```

커버리지 확인:

```bash
npm run coverage
```

현재 테스트는 analyzer, Mermaid 생성/렌더링/export, workspace UI 상호작용을 포함합니다.

## 현재 범위와 제한사항

현재 MVP에 포함되지 않은 항목:

- 사용자 계정, 로그인, 워크스페이스 권한
- 세션 저장 또는 버전 히스토리
- 외부 LLM API 연동
- Jira, Notion, Miro 등 외부 도구 연동
- 실시간 협업 캔버스
- Mermaid sequence diagram 생성
- QA handoff 별도 파일 export

## 참고 문서

- PRD: `.codex/PRPs/prds/ai-user-flow-planner.prd.md`
- 구현 계획/리포트: `.codex/PRPs/plans/`, `.codex/PRPs/reports/`
- 로컬 리뷰 기록: `.codex/PRPs/reviews/`
- 프로젝트 에이전트 지침: `AGENTS.md`
