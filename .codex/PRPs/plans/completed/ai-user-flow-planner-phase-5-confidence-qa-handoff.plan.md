# AI User Flow Planner Phase 5 Plan: Confidence Labels and QA Handoff

## Summary

Phase 5 turns the current analysis output from a planning-only review surface into a QA-ready handoff surface. The implementation should add structured confidence labels for assumptions and unresolved constraints, enrich logic-gap suggestions with QA-friendly test case hints, and render a compact exception handoff section that product, engineering, and QA users can copy into planning reviews.

## User Story

As a QA engineer or PM, I want each assumption and edge-case suggestion to include confidence and test-case framing, so that I can quickly identify risky requirements and convert accepted/rejected exception paths into concrete validation scenarios.

## Metadata

- Complexity: Medium
- Source PRD: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md`
- PRD phase: Phase 5: Confidence Labels and QA Handoff
- Estimated files: 6-8
- Primary code area: `src/features/planning/`
- Requires frontend work: Yes
- Requires new dependencies: No

## UX Design

Current UX:

- `AnalysisPanel` shows assumptions as plain strings.
- `SuggestionReview` shows category, title, description, rationale, and accept/reject controls.
- QA users can infer test cases from suggestion text, but there is no explicit test-case title, trigger, expected behavior, or risk level.

Target UX:

- Assumptions render as structured rows/cards with:
  - confidence label: `high`, `medium`, or `low`
  - reason text
  - follow-up prompt for low/medium confidence
- Each logic-gap suggestion includes QA handoff fields:
  - scenario title
  - precondition
  - trigger
  - expected behavior
  - risk level
- A compact `QA handoff` section lists accepted and rejected exception paths separately:
  - accepted suggestions appear as candidate tests
  - rejected suggestions remain visible as audit exclusions
  - pending suggestions appear as unresolved QA review items
- Visual treatment should mirror existing dense SaaS panels in `AnalysisPanel` and avoid adding a separate landing or decorative surface.

## Mandatory Reading

Read these before implementation:

- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md:130`
  - `Should Have` includes confidence labels for assumptions and unresolved constraints.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md:132`
  - `Should Have` includes QA-friendly exception list output.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningSchema.ts:19`
  - Current `logicGapSuggestionSchema` has only title/description/rationale/status.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningSchema.ts:94`
  - Current `planningAnalysisSchema` stores `assumptions` as `string[]`.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningAnalyzer.ts:58`
  - Analyzer builds assumptions before suggestions and contradictions.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningAnalyzer.ts:164`
  - `buildAssumptions` currently returns plain strings for missing states/entities.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningAnalyzer.ts:185`
  - Suggestion templates are the right source for deterministic QA handoff metadata.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/components/AnalysisPanel.tsx:87`
  - Suggestion review is rendered before Mermaid output.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/components/AnalysisPanel.tsx:108`
  - Assumptions currently use the generic `AnalysisList`.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/PlanningWorkspace.test.tsx:79`
  - Existing user-flow tests cover accept/reject audit behavior and should be extended.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningAnalyzer.test.ts:35`
  - Analyzer tests already verify suggestion generation and are the best RED starting point.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/styles.css:205`
  - Existing panel/card treatment for `empty-state`, `result-banner`, and `analysis-section`.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/styles.css:270`
  - Existing repeated item treatment for suggestions and contradictions.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/package.json:6`
  - Validation commands available: `typecheck`, `test:run`, `coverage`, `build`.

## External Documentation Findings

No new external APIs or libraries are required. Use existing project dependencies:

- Zod schemas already define the local data contracts.
- React state remains local to `PlanningWorkspace`.
- Vitest and Testing Library already cover analyzer and UI behavior.

Do not add state management, export libraries, or AI provider dependencies in this phase.

## Patterns To Mirror

Schema-first additions:

```ts
export const logicGapSuggestionSchema = z.object({
  id: z.string(),
  category: logicGapCategorySchema,
  title: z.string(),
  description: z.string(),
  rationale: z.string(),
  status: suggestionStatusSchema
})
```

Mirror this in `planningSchema.ts` by adding small, explicit schemas for confidence and QA handoff instead of using untyped nested objects.

Immutable template mapping:

```ts
return templates.map((template) => ({
  id: template.id,
  category: template.category,
  title: template.title,
  description: template.description,
  rationale: template.rationale,
  status: 'pending'
}))
```

Mirror this in `planningAnalyzer.ts`; extend templates and map into new objects without mutating suggestions after creation.

UI section pattern:

```tsx
<section className="analysis-section review-section" aria-labelledby="suggestions-title">
  <div className="section-title-row">
    <h3 id="suggestions-title">Logic gap suggestions</h3>
    <span className="audit-counts">
      {acceptedCount} accepted / {rejectedCount} rejected / {pendingCount} pending
    </span>
  </div>
</section>
```

Mirror this for `QA handoff` so the panel stays consistent with the existing SaaS utility UI.

## Files To Change

- `src/features/planning/planningSchema.ts`
  - Add `confidenceLevelSchema`, `planningAssumptionSchema`, `qaHandoffSchema`, and associated types.
  - Change `assumptions` from `z.array(z.string())` to `z.array(planningAssumptionSchema)`.
  - Add `qaHandoff` to `logicGapSuggestionSchema`.
- `src/features/planning/planningAnalyzer.ts`
  - Update `buildAssumptions` to return structured assumptions.
  - Extend `SuggestionTemplate` with QA handoff metadata.
  - Preserve deterministic suggestion ordering and immutability.
- `src/features/planning/components/AnalysisPanel.tsx`
  - Replace generic assumptions list with structured assumption rendering.
  - Add `QA handoff` section derived from current `suggestions`.
  - Keep accept/reject controls in `SuggestionReview`; do not duplicate controls in QA handoff.
- `src/features/planning/planningAnalyzer.test.ts`
  - Add RED tests for confidence labels and QA handoff fields.
  - Update assumptions assertions for structured objects.
- `src/features/planning/PlanningWorkspace.test.tsx`
  - Add UI journey tests for confidence labels and QA handoff grouping by status.
- `src/styles.css`
  - Add compact styles for assumption confidence labels and QA handoff rows using existing color tokens and 8px radius.
- `.codex/PRPs/prds/ai-user-flow-planner.prd.md`
  - Mark Phase 5 complete during implementation and link report after validation.
- `graphify-out/*`
  - Update via `graphify update .` after code changes.

## NOT Building

- No persisted sessions or version history.
- No LLM provider integration.
- No generated downloadable test plan file.
- No CSV, Markdown, or Jira export.
- No sequence diagram generation.
- No backend API or database layer.
- No new design system.

## Step-by-Step Tasks

### Task 1: Add RED analyzer tests for structured confidence and QA handoff

- ACTION: Extend `src/features/planning/planningAnalyzer.test.ts`.
- IMPLEMENT:
  - Assert that missing state/entity assumptions are objects with `id`, `confidence`, `statement`, and `followUpPrompt`.
  - Assert that generated suggestions include `qaHandoff.scenario`, `qaHandoff.precondition`, `qaHandoff.trigger`, `qaHandoff.expectedBehavior`, and `qaHandoff.riskLevel`.
  - Include at least one low/medium confidence case for missing explicit state transitions or entities.
- MIRROR: Existing tests at `planningAnalyzer.test.ts:21` and `planningAnalyzer.test.ts:35`.
- IMPORTS: No new imports expected.
- GOTCHA: This must fail before schema/analyzer changes. A compile-time RED is acceptable if the new fields are missing from the typed result.
- VALIDATE: `npm run test:run -- src/features/planning/planningAnalyzer.test.ts`

### Task 2: Extend schemas and analyzer output

- ACTION: Update `planningSchema.ts` and `planningAnalyzer.ts`.
- IMPLEMENT:
  - Add `confidenceLevelSchema = z.enum(['high', 'medium', 'low'])`.
  - Add `riskLevelSchema = z.enum(['high', 'medium', 'low'])`.
  - Add `planningAssumptionSchema`.
  - Add `qaHandoffSchema`.
  - Update `logicGapSuggestionSchema` and exported types.
  - Update `buildAssumptions` to return structured assumptions.
  - Extend `SuggestionTemplate` with deterministic QA handoff strings.
- MIRROR: `logicGapSuggestionSchema` at `planningSchema.ts:19` and `generateLogicGapSuggestions` at `planningAnalyzer.ts:248`.
- IMPORTS: Add new type imports only if needed by local function signatures.
- GOTCHA: Existing UI currently treats assumptions as strings; do not run full UI tests until UI is updated, or expect temporary failures.
- VALIDATE: `npm run test:run -- src/features/planning/planningAnalyzer.test.ts`

### Task 3: Add RED UI tests for confidence labels and QA handoff

- ACTION: Extend `src/features/planning/PlanningWorkspace.test.tsx`.
- IMPLEMENT:
  - Add a journey where sufficient input lacks explicit states/entities and verify assumption confidence labels render.
  - Add a journey where the user accepts one suggestion and rejects another, then verify `QA handoff` shows accepted, rejected, and pending group summaries.
  - Verify at least one QA scenario and expected behavior is visible.
- MIRROR: Existing accept/reject test at `PlanningWorkspace.test.tsx:79` and grouped analysis test at `PlanningWorkspace.test.tsx:36`.
- IMPORTS: No new libraries expected.
- GOTCHA: Prefer role/text assertions over CSS class assertions.
- VALIDATE: `npm run test:run -- src/features/planning/PlanningWorkspace.test.tsx -t "QA handoff|confidence"`

### Task 4: Render structured assumptions and QA handoff

- ACTION: Update `AnalysisPanel.tsx`.
- IMPLEMENT:
  - Replace `<AnalysisList title="Assumptions" ... />` with `AssumptionList`.
  - Add `QAHandoffList` after `SuggestionReview` and before `MermaidOutputPanel`.
  - Group suggestions by status inside the QA section.
  - Use existing data; do not introduce local duplicated suggestion state.
- MIRROR: `SuggestionReview` section pattern at `AnalysisPanel.tsx:118`.
- IMPORTS: Import new `PlanningAssumption` or `QAHandoff` types as needed.
- GOTCHA: Preserve existing `AnalysisPanel` null and insufficient states.
- VALIDATE: `npm run test:run -- src/features/planning/PlanningWorkspace.test.tsx`

### Task 5: Add compact styles

- ACTION: Update `src/styles.css`.
- IMPLEMENT:
  - Add styles for `.assumption-list`, `.assumption-item`, `.confidence-label`, `.qa-handoff-list`, `.qa-handoff-item`, and status/risk modifiers.
  - Reuse existing greens/yellows/reds and 8px border radius.
  - Ensure long Korean/English scenario text wraps with `overflow-wrap: anywhere`.
- MIRROR: `.suggestion-item` and `.contradiction-item` at `styles.css:270`.
- IMPORTS: N/A.
- GOTCHA: Do not add gradient/orb/decorative backgrounds. Keep dense SaaS layout.
- VALIDATE: `npm run test:run -- src/features/planning/PlanningWorkspace.test.tsx`

### Task 6: Run full validation and graph update

- ACTION: Run all project validation.
- IMPLEMENT:
  - `npm run typecheck`
  - `npm run test:run`
  - `npm run coverage`
  - `npm run build`
  - `npm audit --audit-level=moderate`
  - `git diff --check`
  - `graphify update .`
- MIRROR: Phase 4 validation evidence in `.codex/PRPs/reports/ai-user-flow-planner-phase-4-refinement-export-report.md`.
- IMPORTS: N/A.
- GOTCHA: Build may still show Vite chunk-size warnings from Mermaid. Treat warnings separately from failures.
- VALIDATE: All commands pass; coverage remains >=80% statements/branches/functions/lines.

### Task 7: Write report and update PRD phase status

- ACTION: Create `.codex/PRPs/reports/ai-user-flow-planner-phase-5-confidence-qa-handoff-report.md` and update the PRD.
- IMPLEMENT:
  - Summarize changed behavior.
  - Include validation commands and coverage numbers.
  - Mark Phase 5 as `complete` only after validation passes.
  - Move this plan to `.codex/PRPs/plans/completed/`.
- MIRROR: Existing Phase 4 report and completed plan links in the PRD.
- IMPORTS: N/A.
- GOTCHA: Do not mark complete before implementation and validation evidence exists.
- VALIDATE: `rg -n "Phase 5|confidence|QA handoff" .codex/PRPs/prds/ai-user-flow-planner.prd.md .codex/PRPs/reports`

## Testing Strategy

- Unit:
  - Analyzer returns structured assumptions with confidence labels.
  - Analyzer returns QA handoff metadata for every suggestion template.
  - Insufficient input still returns no suggestions.
  - Contradiction detection remains unchanged.
- Component/integration:
  - Planning workspace displays assumption confidence labels.
  - Suggestion accept/reject still works.
  - QA handoff groups accepted/rejected/pending suggestions.
  - Existing Mermaid generation/export flows still pass.
- Coverage:
  - Maintain >=80% global statements, branches, functions, and lines.

## Validation Commands

```bash
npm run test:run -- src/features/planning/planningAnalyzer.test.ts
npm run test:run -- src/features/planning/PlanningWorkspace.test.tsx
npm run typecheck
npm run test:run
npm run coverage
npm run build
npm audit --audit-level=moderate
git diff --check
graphify update .
```

## Acceptance Criteria

- Assumptions are no longer plain strings; each assumption includes a confidence label and follow-up prompt.
- Every generated logic-gap suggestion includes QA handoff metadata.
- The UI displays confidence labels for assumptions.
- The UI displays a QA handoff section with accepted, rejected, and pending exception paths.
- Existing suggestion review, Mermaid generation, render validation, node refinement, and export behavior still pass.
- No new dependencies are added.
- Coverage remains above 80%.
- PRD Phase 5 is linked to this plan and later marked complete with a report after implementation.

## Risks and Notes

- Schema changes will break all assumptions consumers until UI/tests are updated. Keep the TDD sequence tight.
- QA metadata is deterministic template text, not LLM-generated. This keeps MVP stable but may feel generic for unusual domains.
- Avoid overloading the analysis panel. Keep the QA handoff compact and grouped.
- Rejected suggestions must remain visible for audit value; do not filter them out of QA handoff.
- If future persistence is added, this phase's schema changes will become part of the saved planning session contract.
