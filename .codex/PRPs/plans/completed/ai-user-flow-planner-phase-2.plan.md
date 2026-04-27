# AI User Flow Planner Phase 2 Implementation Plan

## Summary

Implement Phase 2 from the AI User Flow Planner PRD: deterministic logic-gap suggestion generation, contradiction detection, and local accept/reject review state. This builds on Phase 1's parsed planning analysis and keeps all behavior local, schema-validated, and testable.

Phase 2 should not introduce an LLM or Mermaid generation yet. Instead, it should add a reliable product-planning review layer that surfaces at least three relevant edge-case suggestions for sufficient input, flags obvious contradictory rules, and lets the user accept or reject suggestions while preserving rejected items in the visible audit trail.

## User Story

As a product planner, I want the tool to identify missing business logic and obvious contradictory requirements after my MVP notes pass the minimum completeness gate, so that I can decide which exception paths belong in the product flow before diagram generation starts.

## Metadata

- Complexity: Medium
- Source PRD: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md`
- PRD phase: Phase 2, Logic Gap and Contradiction Detection
- Estimated files: 8-12 changed files
- Main deliverable: tested local suggestion/contradiction review workflow
- Target stack: existing React, TypeScript, Zod, Vitest, React Testing Library

## UX Design

Before:

- The user can paste MVP notes and run a minimum completeness analysis.
- The result panel shows personas, entities, actions, states, and assumptions.
- No exception suggestions, contradictions, or accept/reject review controls exist.

After:

- When input is insufficient, the UI continues to focus on minimum guidance and does not show suggestion actions.
- When input is sufficient, the analysis panel shows:
  - a `Contradictions` section when incompatible signals are detected
  - a `Logic gap suggestions` section with at least three suggestions
  - accept/reject controls for each suggestion
  - status labels for `pending`, `accepted`, and `rejected`
  - a compact audit summary such as accepted/rejected/pending counts
- Rejected suggestions remain visible and are not removed from the list.
- Accepted suggestions are visually distinct but do not yet modify Mermaid output because Phase 3 owns generation.
- If contradictions exist, the UI should call out that final diagram generation is blocked in later phases until conflicts are resolved. Phase 2 does not need full conflict-resolution forms.

## Mandatory Reading

- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/AGENTS.md:116` for development workflow.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/AGENTS.md:138` for graphify update requirements after code changes.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md:103` for required exception paths.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md:114` for Must Have items.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md:146` for the target user flow position of contradiction and edge-case review.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md:214` for frontend and orchestration expectations.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md:268` for Phase 2 scope.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/reports/ai-user-flow-planner-phase-1-report.md:129` for Phase 2 follow-up notes.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningSchema.ts:1` for current Zod schemas and exported analysis types.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningAnalyzer.ts:34` for the current analysis pipeline.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/PlanningWorkspace.tsx:7` for local UI state ownership.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/components/AnalysisPanel.tsx:7` for current result rendering.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/PlanningWorkspace.test.tsx:19` for UI workflow test style.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningAnalyzer.test.ts:21` for analyzer test style.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/package.json:6` for available validation commands.

## External Documentation Findings

- React `useState` remains appropriate for Phase 2 local review state because accepted/rejected choices are local, synchronous UI state. Use immutable updates when changing one suggestion status. Source: https://react.dev/reference/react/useState
- Zod remains the right boundary for analysis result shape. Extend existing schemas with suggestion and contradiction schemas so tests and UI share the same contract. Zod supports schema inference and parse/safeParse validation. Source: https://zod.dev/
- Testing Library `user-event` should be used for accept/reject interactions because it simulates user-level interactions instead of only dispatching low-level events. Source: https://testing-library.com/docs/user-event/intro/

## Patterns To Mirror

### Existing Analysis Pipeline

Source: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningAnalyzer.ts:34`

```typescript
export function analyzePlanningInput(rawText: string): PlanningAnalysis {
  const normalizedText = normalizeText(rawText)
  const lines = tokenizeLines(normalizedText)
  // extract groups, compute completeness, parse schema
}
```

Implementation implication: keep Phase 2 deterministic and add suggestion/contradiction derivation inside this pipeline after Phase 1 extraction. Do not add async behavior.

### Schema-First Analysis Shape

Source: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningSchema.ts:16`

```typescript
export const planningAnalysisSchema = z.object({
  rawText: z.string(),
  personas: z.array(z.string()),
  entities: z.array(z.string()),
  actions: z.array(z.string()),
  states: z.array(z.string()),
  assumptions: z.array(z.string()),
  completeness: planningCompletenessSchema
})
```

Implementation implication: add `suggestions` and `contradictions` to the schema, not ad hoc component-only fields.

### UI State Ownership

Source: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/PlanningWorkspace.tsx:7`

```typescript
export function PlanningWorkspace() {
  const [rawText, setRawText] = useState('')
  const [analysis, setAnalysis] = useState<PlanningAnalysis | null>(null)
}
```

Implementation implication: `PlanningWorkspace` should own accepted/rejected suggestion state because it already owns analysis lifecycle and clears stale analysis when text changes.

### Component Test Style

Source: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/PlanningWorkspace.test.tsx:19`

```typescript
const user = userEvent.setup()
render(<PlanningWorkspace />)
await user.type(screen.getByLabelText(/MVP 기획 텍스트/i), '아이디어 앱')
await user.click(screen.getByRole('button', { name: /Analyze/i }))
```

Implementation implication: Phase 2 tests should exercise accept/reject buttons with `userEvent`, not by calling handlers directly.

## Files To Change

Modify:

- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningSchema.ts`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningAnalyzer.ts`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningAnalyzer.test.ts`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/PlanningWorkspace.tsx`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/PlanningWorkspace.test.tsx`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/components/AnalysisPanel.tsx`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/styles.css`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md`

Create if component size becomes noisy:

- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/components/SuggestionReview.tsx`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/components/ContradictionList.tsx`

Do not modify:

- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/AGENTS.md`
  - It currently has an unrelated unstaged duplicate graphify section. Leave it untouched unless the user asks to address P3.

## NOT Building

- No LLM API integration.
- No Mermaid code generation or rendering.
- No export functionality.
- No persisted sessions, backend, database, or auth.
- No full contradiction-resolution workflow. Phase 2 only detects and displays conflicts.
- No automatic mutation of generated flows from accepted suggestions. Phase 3 will consume accepted suggestions.

## Step-By-Step Tasks

### Task 1: Extend Planning Schemas

- ACTION: Add typed contracts for suggestions and contradictions.
- IMPLEMENT:
  - Add `suggestionStatusSchema` with `pending | accepted | rejected`.
  - Add `logicGapCategorySchema` with categories such as `onboarding`, `permission`, `data`, `export`, `quality`, `fallback`.
  - Add `logicGapSuggestionSchema` with `id`, `category`, `title`, `description`, `rationale`, and `status`.
  - Add `contradictionSeveritySchema` with `warning | blocking`.
  - Add `contradictionSchema` with `id`, `severity`, `title`, `description`, `signals`, and `resolutionPrompt`.
  - Add `suggestions` and `contradictions` arrays to `planningAnalysisSchema`.
- MIRROR: Schema-first pattern in `planningSchema.ts:16`.
- IMPORTS: Continue using only `z` from `zod`.
- GOTCHA: Existing tests that assert deep object shapes may need default `[]` expectations if added later.
- VALIDATE: `npm run typecheck`.

### Task 2: Add Analyzer Tests For Suggestions

- ACTION: Write failing unit tests for edge-case suggestion generation.
- IMPLEMENT: Add tests that assert:
  - sufficient MVP input returns at least three suggestions
  - every suggestion starts with `status: 'pending'`
  - suggestions include relevant titles for missing onboarding exit, permission/auth, export/fallback, or data sync depending on input signals
  - insufficient input returns no suggestion actions or returns suggestions only after completeness is sufficient; choose one policy and document it in the test
- MIRROR: AAA style in `planningAnalyzer.test.ts:21`.
- IMPORTS: Existing `describe`, `expect`, `test`, `analyzePlanningInput`.
- GOTCHA: Keep IDs deterministic, for example `edge-onboarding-exit`, so UI keys and tests are stable.
- VALIDATE: `npm run test:run -- planningAnalyzer`.

### Task 3: Implement Deterministic Logic Gap Generation

- ACTION: Add pure helper functions in `planningAnalyzer.ts`.
- IMPLEMENT:
  - `generateLogicGapSuggestions(analysisContext)` should return at least three suggestions for sufficient input.
  - Use extracted actions/states/entities/raw text to select from deterministic suggestion templates.
  - Always include broad MVP-safe suggestions when matching is weak:
    - onboarding abandonment
    - permission or auth failure
    - export or downstream handoff failure
  - Add domain-aware templates when keywords exist:
    - payment/cancel/refund
    - multi-persona notification or approval
    - data sync or external renderer failure
  - Deduplicate by `id` and cap to a readable number, for example 5-6.
- MIRROR: Existing `uniqueLimited()` and keyword helper style in `planningAnalyzer.ts:165`.
- IMPORTS: Use schema types from `planningSchema`.
- GOTCHA: Do not silently generate suggestions for input that fails minimum completeness, otherwise the user may skip Phase 1 guidance.
- VALIDATE: `npm run test:run -- planningAnalyzer`.

### Task 4: Add Analyzer Tests For Contradictions

- ACTION: Write failing tests for contradictory business rules.
- IMPLEMENT: Cover at least:
  - `로그인 없이 구매` plus `회원 전용 혜택` returns a blocking contradiction
  - `무료` plus `결제 필수` or `구독 필수` returns a blocking contradiction
  - `익명` plus `실명 인증 필수` returns a blocking contradiction
  - non-conflicting sufficient input returns an empty contradictions array
- MIRROR: Use deterministic Korean and English fixtures similar to existing Korean label tests at `planningAnalyzer.test.ts:35`.
- IMPORTS: Existing test imports.
- GOTCHA: Contradiction detection should be phrase-pair based, not broad single-keyword matching, to avoid false positives.
- VALIDATE: `npm run test:run -- planningAnalyzer`.

### Task 5: Implement Contradiction Detection

- ACTION: Add pure contradiction detection helpers.
- IMPLEMENT:
  - Normalize text once and evaluate explicit phrase pairs.
  - Return objects with stable IDs such as `conflict-auth-required-vs-guest`.
  - Include user-facing `resolutionPrompt` text that asks the user to choose the governing rule.
  - Add contradictions to `planningAnalysisSchema.parse(...)` output.
- MIRROR: Keep helpers small like `getMissingFields()` in `planningAnalyzer.ts:120`.
- IMPORTS: Schema types from `planningSchema`.
- GOTCHA: Avoid making `completeness.isSufficient` false solely because contradictions exist. Phase 2 should show both "input sufficient" and "logic conflicts found"; later phases can block Mermaid generation.
- VALIDATE: `npm run test:run -- planningAnalyzer`.

### Task 6: Add Suggestion Review State In Workspace

- ACTION: Let users accept/reject suggestions while preserving rejected items.
- IMPLEMENT:
  - Add local state for `reviewedSuggestions`.
  - On analyze, initialize `reviewedSuggestions` from `analysis.suggestions`.
  - On input change, clear both `analysis` and `reviewedSuggestions`.
  - Add `handleSuggestionStatusChange(id, status)`.
  - Pass effective suggestions and handler to `AnalysisPanel`.
- MIRROR: Existing stale-analysis clearing in `PlanningWorkspace.tsx:15`.
- IMPORTS: Add relevant suggestion status type from schema.
- GOTCHA: Do not mutate suggestion objects in place; map to new objects.
- VALIDATE: `npm run typecheck`.

### Task 7: Render Contradictions And Suggestion Controls

- ACTION: Extend the analysis result UI.
- IMPLEMENT:
  - Render a `Contradictions` section above suggestions when `analysis.contradictions.length > 0`.
  - Render each contradiction with severity, title, description, signal list, and resolution prompt.
  - Render `Logic gap suggestions` with title, category, rationale, status, Accept button, and Reject button.
  - Show audit counts for accepted, rejected, and pending.
  - Keep rejected suggestions visible with a rejected status style.
- MIRROR: Existing `AnalysisList` layout in `AnalysisPanel.tsx:69`, but extract `SuggestionReview` and `ContradictionList` if `AnalysisPanel` becomes hard to scan.
- IMPORTS: Suggestion and contradiction types from `planningSchema`.
- GOTCHA: Button labels must be unique enough for tests and screen readers, for example `Accept onboarding abandonment`.
- VALIDATE: `npm run test:run -- PlanningWorkspace`.

### Task 8: Add Component Tests For Review Workflow

- ACTION: Test the Phase 2 user journey.
- IMPLEMENT: Add tests that:
  - sufficient input shows at least three suggestions
  - clicking Accept changes that suggestion to accepted
  - clicking Reject changes that suggestion to rejected and keeps it visible
  - contradictory input shows a blocking contradiction
  - editing the input clears prior suggestion review state
- MIRROR: `userEvent` style in `PlanningWorkspace.test.tsx:50`.
- IMPORTS: Existing test imports.
- GOTCHA: Avoid brittle full-text queries. Prefer roles, accessible names, and section headings.
- VALIDATE: `npm run test:run`.

### Task 9: Style Review Sections Responsively

- ACTION: Add compact styles for contradiction and suggestion review.
- IMPLEMENT:
  - Add status pills for `pending`, `accepted`, and `rejected`.
  - Add button grouping that wraps cleanly on mobile.
  - Use restrained colors distinct from the existing success/warning banners.
  - Ensure long suggestion descriptions wrap without overflow.
- MIRROR: Existing `.analysis-section`, `.status-pill`, and mobile media query in `src/styles.css`.
- IMPORTS: CSS only.
- GOTCHA: This touches `.tsx` and `.css`, so run design review after implementation.
- VALIDATE: Run local UI and inspect desktop/mobile or take Playwright screenshots.

### Task 10: Final Validation And Documentation Updates

- ACTION: Validate and update PRP artifacts after implementation.
- IMPLEMENT:
  - Run all validation commands below.
  - Run `graphify update .` after code changes.
  - Create `.codex/PRPs/reports/ai-user-flow-planner-phase-2-report.md`.
  - Mark Phase 2 complete in the PRD only after implementation validation passes.
  - Move this plan to `.codex/PRPs/plans/completed/`.
- MIRROR: Phase 1 report structure at `.codex/PRPs/reports/ai-user-flow-planner-phase-1-report.md:1`.
- IMPORTS: None.
- GOTCHA: Keep unrelated `AGENTS.md` unstaged change out of any Phase 2 commit unless explicitly requested.
- VALIDATE: `git status --short` should distinguish Phase 2 changes from pre-existing `AGENTS.md` change.

## Testing Strategy

- Unit tests:
  - suggestion generation count, categories, deterministic IDs, pending default status
  - no suggestions for insufficient input
  - contradiction detection phrase-pair fixtures
  - no false contradiction for normal sufficient input
- Component tests:
  - suggestions render after sufficient analysis
  - accept/reject updates status immutably
  - rejected suggestions remain visible
  - contradictions render before suggestions
  - input edits clear review state
- Manual UI checks:
  - desktop and mobile layout with many suggestions
  - long Korean and English text wrapping
  - keyboard focus for accept/reject buttons
- Design review:
  - Required because `.tsx` and `.css` will change.
- Code review:
  - Required before committing shared work.

## Validation Commands

Run in order:

```bash
npm run typecheck
npm run test:run
npm run coverage
npm run build
graphify update .
git status --short
```

Optional visual verification:

```bash
npm run dev -- --host 127.0.0.1
npx playwright screenshot --viewport-size=1440,1000 http://127.0.0.1:5173/ artifacts/phase2-ui/desktop.png
npx playwright screenshot --viewport-size=390,900 http://127.0.0.1:5173/ artifacts/phase2-ui/mobile.png
```

## Acceptance Criteria

- Sufficient input generates at least three relevant logic-gap suggestions.
- Insufficient input does not bypass minimum guidance with suggestion controls.
- Every suggestion has deterministic ID, category, title, description, rationale, and review status.
- User can accept a suggestion.
- User can reject a suggestion.
- Rejected suggestions remain visible for auditability.
- Obvious contradictory rule pairs are detected and shown as blocking contradictions.
- Non-conflicting sufficient input does not show false contradiction warnings.
- Editing input clears analysis and review state.
- Typecheck, tests, coverage, build, graphify update, design review, and code review pass.

## Risks And Notes

- Heuristic contradiction detection can create false positives if implemented with broad keyword matching. Use explicit phrase-pair rules and targeted tests.
- Suggestion generation should be useful without pretending to be AI. Label it as deterministic planning review, not final business logic.
- Accepted/rejected state is local only in Phase 2. Persistence is out of scope and should not be implied in the UI.
- Phase 3 will need accepted suggestions as input for Mermaid generation, so keep the state shape straightforward and typed.
- There is an existing unstaged `AGENTS.md` duplicate graphify-section change. Keep it separate from Phase 2 planning and implementation unless the user requests the P3 cleanup.
