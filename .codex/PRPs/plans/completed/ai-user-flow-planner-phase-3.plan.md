# AI User Flow Planner Phase 3 Implementation Plan

## Summary

Implement Phase 3 from the AI User Flow Planner PRD: generate Mermaid flowchart code from the current planning analysis, render a Mermaid preview, validate render failures, run one bounded deterministic self-correction attempt, and show a fallback state when rendering remains unrecoverable.

This phase should stay local and deterministic. It should not introduce an LLM provider. The generated diagram should consume Phase 1 extraction results and Phase 2 accepted suggestions, block generation when blocking contradictions exist, warn when all suggestions are rejected, and keep raw Mermaid code visible whenever preview rendering fails.

## User Story

As a product planner or engineer, I want accepted planning logic to become a valid Mermaid flowchart with a rendered preview, so that I can review the actual diagram output and see clear recovery states when Mermaid syntax cannot be rendered.

## Metadata

- Complexity: High
- Source PRD: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md`
- PRD phase: Phase 3, Mermaid Generation and Render Validation
- Estimated files: 10-14 changed files
- Main deliverable: tested Mermaid code generation, preview rendering, bounded self-correction, and fallback UI
- Target stack: existing React, TypeScript, Zod, Vitest, React Testing Library, Vite
- New dependency expected: `mermaid`

## UX Design

Before:

- A user can paste MVP notes, analyze completeness, review contradictions, and accept or reject suggested edge cases.
- The UI has no Mermaid output, no preview, no render status, and no render failure recovery.

After:

- When input is insufficient, no diagram generation control is shown.
- When blocking contradictions exist, diagram generation is disabled and the contradictions section remains the primary recovery path.
- When input is sufficient and contradictions are absent, the analysis panel shows a diagram generation action.
- If every suggestion is rejected, the UI shows a happy-path-bias warning but still allows draft generation.
- On generation success, the UI shows:
  - Mermaid code in a readable code pane
  - rendered SVG preview
  - render status badge
  - accepted suggestion count reflected in the generated exception paths
- On first render failure, the system attempts exactly one deterministic syntax self-correction and retries rendering.
- If retry fails, the UI shows fallback status, an error summary, retry count, and the raw Mermaid code for manual review.

## Mandatory Reading

- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/AGENTS.md:116` for the required development workflow.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/AGENTS.md:138` for graphify update requirements after code changes.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md:103` for required exception paths, especially Mermaid render failure and happy-path warning.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md:122` for Mermaid generation/render must-haves.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md:178` for the target render/self-correction/fallback flow.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md:216` for frontend surface expectations.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md:246` for validation and retry-limit requirements.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md:281` for Phase 3 scope.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/reports/ai-user-flow-planner-phase-2-report.md:111` for Phase 3 follow-up notes.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningSchema.ts:16` for current suggestion and contradiction schemas.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningAnalyzer.ts:41` for the current deterministic analysis pipeline.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/PlanningWorkspace.tsx:7` for local workspace state ownership.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/components/AnalysisPanel.tsx:56` for current contradiction and suggestion rendering.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/PlanningWorkspace.test.tsx:73` for user-event interaction test style.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningAnalyzer.test.ts:35` for analyzer unit test style.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/styles.css:121` for the existing two-column workspace layout and panel style.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/package.json:6` for available validation scripts.

## External Documentation Findings

- Mermaid can be installed as an npm package and rendered client-side. Official usage docs list `npm install mermaid` and recommend importing Mermaid as an ESM dependency for hosted web pages. Source: https://mermaid.ai/open-source/config/usage.html
- For dynamic rendering, Mermaid supports `mermaid.initialize({ startOnLoad: false })` and `await mermaid.render(id, graphDefinition)`, returning SVG that can be inserted into the DOM. Source: https://mermaid.ai/open-source/config/usage.html
- Mermaid syntax can be validated without rendering through `mermaid.parse(text, parseOptions)`. With `suppressErrors: true`, invalid definitions can return `false` instead of throwing. Source: https://mermaid.ai/open-source/config/usage.html
- The high-level `render` API returns `{ svg, diagramType, bindFunctions }`. The render id must be unique, and render calls are queued to prevent race conditions. Source: https://www.mintlify.com/mermaid-js/mermaid/api/methods/render
- The internal `mermaid.mermaidAPI` surface is documented as deprecated for external use; use top-level `parse` and `render` instead. Source: https://mermaid.ai/open-source/config/setup/mermaid/interfaces/Mermaid.html

## Patterns To Mirror

### Schema-First Contracts

Source: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningSchema.ts:39`

```typescript
export const planningAnalysisSchema = z.object({
  rawText: z.string(),
  personas: z.array(z.string()),
  entities: z.array(z.string()),
  actions: z.array(z.string()),
  states: z.array(z.string()),
  assumptions: z.array(z.string()),
  suggestions: z.array(logicGapSuggestionSchema),
  contradictions: z.array(contradictionSchema),
  completeness: planningCompletenessSchema
})
```

Implementation implication: add Mermaid document and render status schemas instead of passing ad hoc strings around components.

### Deterministic Analyzer Helpers

Source: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningAnalyzer.ts:248`

```typescript
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
```

Implementation implication: create a deterministic `generateMermaidFlow()` helper that takes a typed planning analysis plus reviewed suggestions and returns stable Mermaid code.

### Workspace State Ownership

Source: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/PlanningWorkspace.tsx:7`

```typescript
export function PlanningWorkspace() {
  const [rawText, setRawText] = useState('')
  const [analysis, setAnalysis] = useState<PlanningAnalysis | null>(null)
  const [reviewedSuggestions, setReviewedSuggestions] = useState<LogicGapSuggestion[]>([])
```

Implementation implication: keep generation/render state in `PlanningWorkspace` for Phase 3, and clear it when input changes or a new analysis starts.

### Existing Review UI

Source: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/components/AnalysisPanel.tsx:76`

```typescript
function SuggestionReview({ suggestions, onSuggestionStatusChange }: SuggestionReviewProps) {
  const acceptedCount = suggestions.filter((suggestion) => suggestion.status === 'accepted').length
  const rejectedCount = suggestions.filter((suggestion) => suggestion.status === 'rejected').length
  const pendingCount = suggestions.filter((suggestion) => suggestion.status === 'pending').length
```

Implementation implication: the generation gate should derive accepted/rejected/pending counts from the same reviewed suggestions state to avoid inconsistent UI.

### User-Event Component Tests

Source: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/PlanningWorkspace.test.tsx:73`

```typescript
await user.click(screen.getByRole('button', { name: 'Accept Data sync failure' }))
await user.click(screen.getByRole('button', { name: 'Reject Multi-persona notification gap' }))
```

Implementation implication: Phase 3 tests should click real generation controls and assert visible Mermaid code, preview status, contradiction blocks, and fallback states.

## Files To Change

Modify:

- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/package.json`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/package-lock.json`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningSchema.ts`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/PlanningWorkspace.tsx`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/PlanningWorkspace.test.tsx`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/components/AnalysisPanel.tsx`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/styles.css`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md`

Create:

- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/mermaidGenerator.ts`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/mermaidGenerator.test.ts`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/mermaidRenderer.ts`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/mermaidRenderer.test.ts`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/components/MermaidOutputPanel.tsx`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/reports/ai-user-flow-planner-phase-3-report.md`

Do not modify unless separately requested:

- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/AGENTS.md`
  - The earlier duplicate-graphify review finding is not present in current HEAD. Keep AGENTS out of Phase 3 unless a new docs review asks for it.

## NOT Building

- No real LLM API integration.
- No backend, persistence, authentication, or saved sessions.
- No node-level edit/refinement workflow; Phase 4 owns that.
- No copy, SVG export, or image export; Phase 4 owns export.
- No sequence diagram generation.
- No arbitrary user-authored Mermaid editor beyond showing the generated code and fallback text.
- No unsafe direct insertion of user text as HTML outside Mermaid-rendered SVG.

## Step-By-Step Tasks

### Task 1: Install Mermaid Dependency

- ACTION: Add Mermaid as a runtime dependency.
- IMPLEMENT:
  - Run `npm install mermaid`.
  - Confirm `package.json` and `package-lock.json` update cleanly.
  - Do not add CDN script tags; use ESM import from the npm package.
- MIRROR: Existing dependency placement in `package.json:15`.
- IMPORTS: None in source yet.
- GOTCHA: Mermaid is browser-oriented. Renderer tests may need the wrapper mocked or limited to parse/self-correction unit tests if jsdom lacks full SVG layout support.
- VALIDATE: `npm run typecheck`.

### Task 2: Extend Mermaid Schemas

- ACTION: Add typed contracts for generated Mermaid and render state.
- IMPLEMENT:
  - Add `mermaidRenderStatusSchema` with `idle | blocked | generated | rendering | rendered | correcting | fallback`.
  - Add `mermaidDocumentSchema` with `code`, `renderStatus`, `retryCount`, `renderError`, `svg`, `isHappyPathBiased`, and `blockedReason`.
  - Export inferred types.
  - Keep `svg` optional or nullable so fallback code output can exist without preview markup.
- MIRROR: Schema-first analysis shape in `planningSchema.ts:39`.
- IMPORTS: Continue using only `z` from `zod`.
- GOTCHA: Do not attach Mermaid document to `PlanningAnalysis` unless generation should happen on every analysis. Keep it as a separate state object in Phase 3.
- VALIDATE: `npm run typecheck`.

### Task 3: Add Mermaid Generator Tests

- ACTION: Write failing tests for deterministic Mermaid generation.
- IMPLEMENT: Add tests that assert:
  - sufficient analysis with accepted suggestions generates code beginning with `flowchart TD`
  - personas, actions, states, and accepted suggestions appear as quoted Mermaid labels
  - rejected suggestions do not become exception-path nodes
  - all rejected suggestions set `isHappyPathBiased: true`
  - blocking contradictions return a blocked result and no renderable code
  - labels containing punctuation, parentheses, quotes, brackets, or Korean text are escaped safely
- MIRROR: Analyzer test style in `planningAnalyzer.test.ts:35`.
- IMPORTS: `describe`, `expect`, `test`, `analyzePlanningInput`, generator helper and types.
- GOTCHA: Mermaid node IDs should be deterministic ASCII IDs such as `persona_1`, `action_1`, `exception_1`; never derive node IDs directly from user text.
- VALIDATE: `npm run test:run -- mermaidGenerator`.

### Task 4: Implement Deterministic Mermaid Generator

- ACTION: Create `mermaidGenerator.ts`.
- IMPLEMENT:
  - Export `generateMermaidFlow({ analysis, suggestions })`.
  - Block when `analysis.completeness.isSufficient` is false.
  - Block when any contradiction has `severity: 'blocking'`.
  - Build a readable `flowchart TD` with subgraphs for:
    - `Input`
    - `Analysis`
    - `Review`
    - `Exception Paths`
    - `Output`
  - Include decision diamonds for completeness, contradiction check, suggestion review, and render validation.
  - Merge accepted suggestions into exception-path nodes.
  - If no suggestions are accepted and at least one is rejected, include a happy-path warning node and set `isHappyPathBiased`.
  - Quote every user-facing label with escaped double quotes.
- MIRROR: Deterministic suggestion generation in `planningAnalyzer.ts:248`.
- IMPORTS: Types from `planningSchema`.
- GOTCHA: Keep generated code intentionally simple. Avoid Mermaid features that require extra config, HTML labels, icon packs, or unsupported shape syntax.
- VALIDATE: `npm run test:run -- mermaidGenerator`.

### Task 5: Add Renderer And Self-Correction Tests

- ACTION: Write tests for render lifecycle and deterministic correction.
- IMPLEMENT: Add tests that assert:
  - valid Mermaid code returns rendered status when the Mermaid adapter resolves with SVG
  - invalid code triggers exactly one correction attempt
  - correction success returns retry count `1` and rendered status
  - correction failure returns fallback status, retry count `1`, error summary, and original or corrected code
  - self-correction normalizes common generated mistakes such as `graph TD` to `flowchart TD`, unquoted labels with brackets, and duplicate blank lines
- MIRROR: Component and helper unit test style from existing tests.
- IMPORTS: `vi` from Vitest if mocking Mermaid adapter functions.
- GOTCHA: Do not rely on actual browser layout in unit tests. Mock `mermaid.parse` and `mermaid.render` through a narrow adapter so tests stay deterministic.
- VALIDATE: `npm run test:run -- mermaidRenderer`.

### Task 6: Implement Mermaid Renderer Adapter

- ACTION: Create a small wrapper around Mermaid `parse` and `render`.
- IMPLEMENT:
  - Initialize Mermaid once with `startOnLoad: false` and a conservative security setting.
  - Export `renderMermaidDocument(code, options?)`.
  - Use a unique render ID per attempt, for example `planner-diagram-${counter}`.
  - Call top-level `mermaid.parse(code)` before rendering.
  - Call top-level `mermaid.render(id, code)` and return SVG.
  - Catch parse/render errors and return typed failure summaries rather than throwing into React.
  - Export a pure `correctMermaidSyntax(code)` helper for deterministic one-pass correction.
- MIRROR: Existing pure helper style in `planningAnalyzer.ts:77`.
- IMPORTS: `mermaid` package.
- GOTCHA: Official docs mark `mermaid.mermaidAPI` as deprecated for external use; do not use it. Keep `innerHTML` insertion isolated in the preview component and only with SVG returned by Mermaid.
- VALIDATE: `npm run typecheck` and `npm run test:run -- mermaidRenderer`.

### Task 7: Wire Generation State In Workspace

- ACTION: Add diagram generation lifecycle to `PlanningWorkspace`.
- IMPLEMENT:
  - Add `mermaidDocument` state.
  - Clear `mermaidDocument` on input change, new analysis, or suggestion status change.
  - Add `handleGenerateMermaid` as an async function:
    - call `generateMermaidFlow`
    - if blocked, set blocked document state
    - if generated, set generated/rendering state
    - call renderer
    - on failure, run one correction attempt and retry
    - on second failure, set fallback state
  - Pass generation state and handler to output components.
- MIRROR: Current stale-state clearing in `PlanningWorkspace.tsx:19`.
- IMPORTS: generator, renderer, `MermaidDocument` type.
- GOTCHA: Guard against stale async render results after input changes. Use a request id or local cancellation flag so older render promises cannot overwrite newer analysis state.
- VALIDATE: `npm run typecheck`.

### Task 8: Render Mermaid Output UI

- ACTION: Add visible Mermaid generation, preview, code, blocked, and fallback states.
- IMPLEMENT:
  - Create `MermaidOutputPanel`.
  - Show a `Generate Mermaid` button only for sufficient analysis.
  - Disable generation when blocking contradictions exist and explain why.
  - Show happy-path warning when all suggestions are rejected.
  - Render SVG preview using a tightly scoped `dangerouslySetInnerHTML` only for Mermaid-returned SVG.
  - Show Mermaid code in a `<pre><code>` block.
  - Show retry count and render error in fallback state.
  - Keep layout compact and consistent with existing panels.
- MIRROR: Existing panel/card CSS in `AnalysisPanel.tsx:29` and `styles.css:205`.
- IMPORTS: `MermaidDocument`, `PlanningAnalysis`, `LogicGapSuggestion`.
- GOTCHA: React escapes normal text, but `dangerouslySetInnerHTML` is a security-sensitive exception. Only use sanitized/renderer-returned SVG and never inject raw user text directly.
- VALIDATE: `npm run test:run -- PlanningWorkspace`.

### Task 9: Add Workspace Tests For Generation Flow

- ACTION: Cover the end-to-end UI state transitions at component level.
- IMPLEMENT: Add tests that assert:
  - sufficient input and one accepted suggestion enables Mermaid generation
  - generated Mermaid code is visible
  - accepted suggestions appear in code; rejected suggestions do not
  - blocking contradictions disable generation or show blocked state
  - editing input clears Mermaid output
  - all rejected suggestions show happy-path warning but generation is allowed
  - render fallback displays raw code after simulated render failure
- MIRROR: `PlanningWorkspace.test.tsx:51` for stale-state clearing.
- IMPORTS: Mock the renderer module with Vitest if needed.
- GOTCHA: Async rendering means tests should use `findBy...` or `waitFor`, not immediate `getBy...` after clicking generate.
- VALIDATE: `npm run test:run -- PlanningWorkspace`.

### Task 10: Style And Verify The Preview Experience

- ACTION: Add responsive styles and visual verification.
- IMPLEMENT:
  - Add classes for output panel, code pane, preview surface, status badges, blocked/fallback banners, and happy-path warning.
  - Ensure long Mermaid code wraps or scrolls horizontally without breaking layout.
  - Ensure SVG preview has stable min-height and empty/fallback states do not collapse.
  - Run the dev server and capture desktop/mobile screenshots for:
    - rendered preview
    - blocked contradiction state
    - fallback render state if practical
  - Run `graphify update .` after code changes.
- MIRROR: Existing responsive rules in `styles.css:336`.
- IMPORTS: None.
- GOTCHA: Do not create nested cards. Keep preview/code as panels or sections within the existing right-side workflow.
- VALIDATE: `npm run build`, browser screenshot verification, and `graphify update .`.

## Testing Strategy

- Unit tests:
  - Mermaid generator produces deterministic, escaped, flowchart-only code.
  - Generator blocks insufficient input and blocking contradictions.
  - Renderer adapter maps parse/render success and failure into typed results.
  - Self-correction runs once and never loops.
- Component tests:
  - User accepts/rejects suggestions, generates Mermaid, sees preview/code/status.
  - Contradictions block generation.
  - Editing input clears generated output and prevents stale diagrams.
  - Fallback state preserves raw code after render failure.
- Visual checks:
  - Desktop and mobile screenshots for rendered and blocked states.
  - Confirm no overlapping labels, buttons, code panes, or SVG preview containers.
- Security checks:
  - No secrets.
  - No Mermaid code generated from user text as raw HTML.
  - `dangerouslySetInnerHTML` limited to Mermaid-rendered SVG only.

## Validation Commands

- `npm install mermaid`
- `npm run typecheck`
- `npm run test:run -- mermaidGenerator`
- `npm run test:run -- mermaidRenderer`
- `npm run test:run -- PlanningWorkspace`
- `npm run test:run`
- `npm run coverage`
- `npm run build`
- `npm run dev -- --host 127.0.0.1`
- Browser verification or Playwright screenshot checks for desktop and mobile layouts
- `graphify update .`
- `$design-review`
- `$code-review-workflow`

## Acceptance Criteria

- A sufficient, non-contradictory analysis can generate Mermaid `flowchart TD` code.
- The generated code includes extracted planning actions and accepted suggestions.
- Rejected suggestions remain visible in review UI but do not become exception nodes.
- If every suggestion is rejected, the UI warns that the diagram may be happy-path biased and still allows draft generation.
- Blocking contradictions prevent Mermaid generation and show an actionable blocked state.
- Mermaid preview renders successfully for valid generated code.
- Render failures trigger no more than one deterministic correction attempt.
- Unrecoverable render failures show fallback status, retry count, error summary, and raw Mermaid code.
- Editing input, re-analyzing, or changing suggestion statuses clears stale Mermaid output.
- Unit and component tests cover success, block, warning, correction, and fallback paths.
- Typecheck, tests, coverage, build, graphify update, design review, and code review pass.

## Risks And Notes

- Mermaid rendering in jsdom may not behave like a real browser. Keep renderer tests focused on adapter contracts and verify real rendering through a dev server/browser screenshot.
- `dangerouslySetInnerHTML` is security-sensitive. The only acceptable usage is inserting SVG returned by Mermaid after parse/render succeeds.
- Mermaid syntax is strict. The generator should prefer simple quoted labels and deterministic node IDs over complex syntax.
- Async render results can become stale if input changes while rendering. Use request ids or cancellation guards.
- The review finding about stale successful analysis is already resolved in current `PlanningWorkspace.tsx:19` because input changes clear `analysis` and `reviewedSuggestions`.
- The review finding about duplicate graphify instructions is not present in current `AGENTS.md:138`; Phase 3 should leave AGENTS unchanged unless a new docs task requests it.
