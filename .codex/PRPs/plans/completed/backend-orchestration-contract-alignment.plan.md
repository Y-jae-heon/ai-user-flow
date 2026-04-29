# Backend Orchestration Phase 1 Plan: Contract Alignment

## Summary

Phase 1 defines the backend-facing contract without building the backend runtime yet. The implementation should extend the existing Zod schema layer so the frontend and future API can share one typed contract for nine planning elements, session snapshots, entity mappings, state-machine transitions, validation reports, and API response envelopes.

The work should preserve the current local MVP behavior while making the API boundary explicit. Existing analyzer, Mermaid generation, rendering, suggestion review, QA handoff, and export behavior should keep passing.

## User Story

As a backend developer integrating the AI User Flow Planner, I want a versioned request and response contract that mirrors the current frontend data model, so I can implement API endpoints without guessing how the UI expects planning analysis, Mermaid output, and validation errors to be shaped.

## Metadata

- Complexity: Medium
- Source PRD: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md`
- PRD phase: Phase 1: Contract alignment
- Plan path: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/plans/completed/backend-orchestration-contract-alignment.plan.md`
- Estimated files: 5-7
- Primary code area: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/`
- Requires frontend work: Minimal, only if wiring input elements into current local analysis is chosen
- Requires backend server work: No
- Requires new dependencies: No

## UX Design

Current UX:

- `InputPanel` accepts a single raw text area.
- `PlanningWorkspace` calls local `analyzePlanningInput(rawText)`.
- `AnalysisPanel` renders completeness, contradictions, suggestions, QA handoff, Mermaid output, and extracted lists.

Target UX for Phase 1:

- No visible UI redesign is required.
- The raw text input remains the primary demo flow.
- The codebase gains a typed `PlanningSession` and API-compatible contract that can accept either raw text alone or raw text plus nine optional planning elements.
- If the nine-element payload is not exposed in UI yet, tests should cover the contract at the schema/service layer.

## Mandatory Reading

Read these before implementation:

- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:77`
  - Must-have scope starts with accepting nine planning elements plus raw freeform text.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:111`
  - PRD data schema defines `PlanningSession`, `input.elements`, dependency analysis, entity mappings, state machine, and validation report.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:235`
  - Entity relationship mapping defines Actor, Object, Action, State, Rule, Exception, FlowNode, FlowEdge, and MermaidDocument.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:249`
  - State machine design defines allowed states and transitions.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:333`
  - API endpoint suggestions define the future route contracts this phase should support at DTO level.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:391`
  - Phase table identifies Phase 1 as contract alignment.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningSchema.ts:5`
  - Current input schema only accepts `{ rawText }`; this is the main extension point.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningSchema.ts:112`
  - Current `planningAnalysisSchema` is the compatibility target for API analysis responses.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/PlanningWorkspace.tsx:33`
  - Current UI entry point calls `analyzePlanningInput(rawText)` directly.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/PlanningWorkspace.tsx:81`
  - Current Mermaid generation combines `PlanningAnalysis` and reviewed suggestions.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/mermaidGenerator.ts:24`
  - `generateMermaidFlow` consumes the analysis contract and returns `MermaidDocument`.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/mermaidRenderer.ts:44`
  - Renderer contract returns a validated `MermaidDocument` and should remain unchanged in Phase 1.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningAnalyzer.test.ts:21`
  - Existing analyzer tests define minimum compatibility behavior for sufficient input.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/mermaidGenerator.test.ts:29`
  - Existing Mermaid tests define the generated document compatibility behavior.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/package.json:6`
  - Available validation commands: `typecheck`, `test:run`, `coverage`, and `build`.

## External Documentation Findings

- Zod is a TypeScript-first validation library with static type inference, which fits the current `planningSchema.ts` approach and avoids duplicating DTO types in Phase 1. Source: [Zod docs](https://zod.dev/).
- Zod JSON Schema conversion exists, but `z.fromJSONSchema()` is marked experimental. Do not depend on reverse conversion for the contract; keep Zod as source of truth and only export JSON Schema later if needed. Source: [Zod JSON Schema docs](https://zod.dev/json-schema?id=configuration).
- Mermaid official flowchart docs confirm subgraphs are first-class syntax and warn that lowercase `end` in node text can break flowcharts. Contract tests should preserve label escaping/normalization before later backend generation work. Source: [Mermaid flowchart syntax](https://mermaid.js.org/syntax/flowchart).
- NestJS `ValidationPipe` supports DTO validation and whitelisting, but it is a future backend implementation concern. Phase 1 should not add NestJS dependencies to the Vite frontend repo. Source: [NestJS validation docs](https://docs.nestjs.com/techniques/validation).
- LangGraph.js `StateGraph` uses shared state, nodes, edges, conditional edges, and requires `.compile()` before invocation. This informs later workflow phases, but Phase 1 should only name compatible state/transition DTOs. Source: [LangGraph.js StateGraph API](https://langchain-ai.github.io/langgraphjs/reference/classes/langgraph.StateGraph.html).

## Patterns To Mirror

Schema-first contract:

```ts
export const planningCompletenessSchema = z.object({
  isSufficient: z.boolean(),
  score: z.number().min(0).max(100),
  missingFields: z.array(missingFieldSchema),
  guidance: z.array(z.string())
})
```

Mirror this in `planningSchema.ts` by adding small explicit Zod schemas for each backend contract unit rather than a single loose `z.record(z.unknown())`.

Compatible analysis response:

```ts
export const planningAnalysisSchema = z.object({
  rawText: z.string(),
  personas: z.array(z.string()),
  entities: z.array(z.string()),
  actions: z.array(z.string()),
  states: z.array(z.string()),
  assumptions: z.array(planningAssumptionSchema),
  suggestions: z.array(logicGapSuggestionSchema),
  contradictions: z.array(contradictionSchema),
  completeness: planningCompletenessSchema
})
```

Keep this shape intact. Backend response schemas should wrap or reference this contract rather than replacing it.

Immutable state updates:

```ts
setReviewedSuggestions((currentSuggestions) =>
  currentSuggestions.map((suggestion) => {
    if (suggestion.id !== id) {
      return suggestion
    }

    return {
      ...suggestion,
      status
    }
  })
)
```

Use the same immutable pattern for any contract helper that updates suggestion status, session status, or node labels.

Mermaid document boundary:

```ts
return mermaidDocumentSchema.parse({
  code,
  renderStatus: 'generated',
  blockedReason: null,
  isHappyPathBiased: draft.isHappyPathBiased,
  ...EMPTY_RENDER_FIELDS
})
```

Future API responses should carry `MermaidDocument` as a schema-validated object, not ad hoc fields.

## Files To Change

- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningSchema.ts`
  - Add `planningElementKeySchema`, `planningElementsSchema`, `planningSessionStatusSchema`, `planningSessionInputSchema`, entity mapping schemas, state machine schemas, validation report schema, API response envelope schemas, and exported types.
  - Extend `planningInputSchema` to accept optional `elements` while keeping `{ rawText }` valid.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningContracts.ts`
  - New file for contract constants and helper functions if `planningSchema.ts` starts getting too large.
  - Candidate helpers: `createPlanningSessionSnapshot`, `normalizePlanningSessionInput`, `createSuccessEnvelope`, `createErrorEnvelope`.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningContracts.test.ts`
  - New focused tests for nine-element parsing, API envelopes, session status, state-machine DTOs, and compatibility with existing `PlanningAnalysis`.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningAnalyzer.ts`
  - Optional only: accept `PlanningInput` instead of raw string through a wrapper if needed. Keep `analyzePlanningInput(rawText: string)` for compatibility.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningAnalyzer.test.ts`
  - Add regression tests only if analyzer wrapper behavior changes.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/PlanningWorkspace.test.tsx`
  - Add regression only if UI wiring changes.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md`
  - Mark Phase 1 `in-progress` and link this plan.

## NOT Building

- No NestJS, FastAPI, API route, server process, controller, or network client.
- No LangGraph runtime or AI provider integration.
- No Redis, PostgreSQL, persistence, idempotency storage, or rate limiting.
- No RAG template retrieval.
- No backend-rendered SVG/PNG export.
- No frontend redesign for nine separate form fields unless explicitly pulled into a later integration phase.
- No changes to Mermaid generation logic beyond type compatibility if required.

## Step-by-Step Tasks

### Task 1: Add RED tests for the planning input contract

- ACTION: Create `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningContracts.test.ts`.
- IMPLEMENT:
  - Assert `planningInputSchema.parse({ rawText: '...' })` still works.
  - Assert a payload with all nine planning elements parses.
  - Assert unknown element keys are rejected or stripped according to the chosen strictness; prefer rejecting via `.strict()` for API boundary clarity.
  - Assert empty strings in optional element fields are normalized or rejected consistently. Prefer schema acceptance plus helper-level normalization so partial drafts can exist.
- MIRROR: Existing schema parse usage in `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningAnalyzer.ts:65`.
- IMPORTS: Import schemas/types from `./planningSchema`; import helper functions from `./planningContracts` once created.
- GOTCHA: Keep `rawText` as the only required field to preserve current UI behavior.
- VALIDATE: `npm run test:run -- src/features/planning/planningContracts.test.ts`

### Task 2: Extend `planningSchema.ts` with backend contract DTOs

- ACTION: Update `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningSchema.ts`.
- IMPLEMENT:
  - Define nine element keys: `mvpDefinition`, `targetUser`, `problem`, `coreScenario`, `successResult`, `dataDependency`, `exceptionCase`, `policyConstraint`, `exportNeed`.
  - Add `planningElementsSchema` as a strict object with optional string fields.
  - Extend `planningInputSchema` to `{ rawText: z.string(), elements: planningElementsSchema.optional() }`.
  - Add schemas for:
    - `dependencyAnalysisItemSchema`
    - `planningActorSchema`
    - `planningObjectSchema`
    - `planningActionSchema`
    - `businessRuleSchema`
    - `exceptionPathSchema`
    - `planningStateSchema`
    - `planningStateTransitionSchema`
    - `planningStateMachineSchema`
    - `planningValidationReportSchema`
    - `planningSessionSnapshotSchema`
    - `apiErrorSchema`
    - generic-compatible `apiSuccessEnvelopeSchema` and `apiFailureEnvelopeSchema`
  - Export inferred types for every new schema.
- MIRROR: Existing explicit schema/type export pattern at `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningSchema.ts:124`.
- IMPORTS: No new dependencies.
- GOTCHA: Zod generic schemas can become awkward; if a generic envelope is hard to type, define concrete envelopes such as `planningSessionResponseSchema`, `planningAnalysisResponseSchema`, and `mermaidGenerationResponseSchema`.
- VALIDATE: `npm run test:run -- src/features/planning/planningContracts.test.ts`

### Task 3: Add contract helpers without changing UI behavior

- ACTION: Create `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningContracts.ts`.
- IMPLEMENT:
  - `normalizePlanningSessionInput(input: PlanningInput): PlanningInput`
    - Trim `rawText`.
    - Trim element string values.
    - Drop element fields that become empty strings.
    - Return new objects only.
  - `createPlanningSessionSnapshot(input, analysis?)`
    - Builds a schema-validated session snapshot with a deterministic status based on completeness:
      - no analysis: `input_received`
      - insufficient: `needs_clarification`
      - blocking contradiction: `needs_clarification`
      - sufficient: `ready_for_generation`
    - Include `PlanningAnalysis` when available without altering its shape.
  - `createSuccessEnvelope(data)` and `createFailureEnvelope(error)` or concrete envelope helpers.
- MIRROR: Immutable object creation in `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/mermaidGenerator.ts:37`.
- IMPORTS: Import schemas and types from `./planningSchema`.
- GOTCHA: Do not call `analyzePlanningInput` inside the snapshot helper unless the helper explicitly receives raw text only; keep contract helpers deterministic and easy to unit test.
- VALIDATE: `npm run test:run -- src/features/planning/planningContracts.test.ts`

### Task 4: Add tests for session snapshots, entity mapping DTOs, and state machine DTOs

- ACTION: Extend `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningContracts.test.ts`.
- IMPLEMENT:
  - Parse a `planningSessionSnapshot` with:
    - normalized input
    - `PlanningAnalysis`
    - dependency analysis
    - actor/object/action mappings
    - state machine states and transitions
    - validation report
  - Assert invalid state transitions fail when `from`, `to`, or `condition` is empty.
  - Assert `MermaidDocument` and `FlowDraft` remain embeddable in response DTOs.
  - Assert API failure envelopes include stable machine-readable `code` and user-safe `message`.
- MIRROR: Existing render status schema at `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningSchema.ts:57`.
- IMPORTS: Use `analyzePlanningInput` only to create realistic `PlanningAnalysis` fixtures.
- GOTCHA: Avoid overfitting to future persistence tables. These are transport DTOs, not database migrations.
- VALIDATE: `npm run test:run -- src/features/planning/planningContracts.test.ts`

### Task 5: Preserve analyzer and Mermaid compatibility

- ACTION: Run existing planning tests, then patch only if type or behavior regressions appear.
- IMPLEMENT:
  - Keep `analyzePlanningInput(rawText: string)` unchanged for current UI.
  - If useful, add a separate `analyzePlanningPayload(input: PlanningInput)` wrapper that normalizes input and calls `analyzePlanningInput(normalized.rawText)`.
  - Do not change suggestion IDs, statuses, QA handoff fields, render statuses, flow node shapes, or export statuses.
- MIRROR:
  - Analyzer behavior in `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningAnalyzer.test.ts:21`.
  - Mermaid behavior in `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/mermaidGenerator.test.ts:29`.
- IMPORTS: Import `PlanningInput` only if a wrapper is added.
- GOTCHA: Current `PlanningWorkspace` is local-first. Do not introduce async API state in this phase.
- VALIDATE:
  - `npm run test:run -- src/features/planning/planningAnalyzer.test.ts`
  - `npm run test:run -- src/features/planning/mermaidGenerator.test.ts`
  - `npm run test:run -- src/features/planning/PlanningWorkspace.test.tsx`

### Task 6: Add API contract documentation close to source

- ACTION: Add or update lightweight docs in `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/`.
- IMPLEMENT:
  - Prefer `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningContracts.md` if a Markdown contract is helpful.
  - Document the nine planning elements, endpoint-to-schema mapping, response envelope shape, and what remains local-only.
  - Keep this file generated from or synchronized with schema names manually for now; do not add a doc generation dependency.
- MIRROR: PRD endpoint suggestions at `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:333`.
- IMPORTS: N/A.
- GOTCHA: Do not create a new top-level docs file; project guidance says to use the existing docs structure unless there is no obvious location.
- VALIDATE: `rg -n "planningSessionSnapshotSchema|planningInputSchema|POST /api/planning-sessions" src/features/planning`

### Task 7: Run full validation and update planning artifacts

- ACTION: Validate the repo and update PRD phase status when implementation is complete.
- IMPLEMENT:
  - Run:
    - `npm run typecheck`
    - `npm run test:run`
    - `npm run coverage`
    - `npm run build`
    - `npm audit --audit-level=moderate`
    - `git diff --check`
  - If code files changed, run `graphify update .`.
  - Create a report at `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/reports/backend-orchestration-contract-alignment-report.md`.
  - Mark PRD Phase 1 `complete` and link the report after validation passes.
- MIRROR: Existing report pattern in `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/reports/ai-user-flow-planner-phase-5-confidence-qa-handoff-report.md`.
- IMPORTS: N/A.
- GOTCHA: `graphify update .` is not required for this planning-only turn, but it is required after future code modifications.
- VALIDATE: All listed commands pass; coverage remains at least 80%.

## Testing Strategy

- Start with `planningContracts.test.ts` RED tests before adding schema/helper implementation.
- Keep schema tests focused on parse success, parse failure, normalization, and envelope stability.
- Keep existing analyzer, Mermaid generator, renderer, and workspace tests as regression coverage.
- Use one realistic fixture from `analyzePlanningInput` to prove new session snapshots can embed the current `PlanningAnalysis` without transforming it.
- Do not add E2E tests in Phase 1 because there is no new user-visible flow.

## Validation Commands

```bash
npm run test:run -- src/features/planning/planningContracts.test.ts
npm run test:run -- src/features/planning/planningAnalyzer.test.ts
npm run test:run -- src/features/planning/mermaidGenerator.test.ts
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

- `planningInputSchema` accepts current `{ rawText }` payloads and optional nine-element payloads.
- New session, entity mapping, state-machine, validation report, and API envelope schemas are exported with inferred TypeScript types.
- Contract helpers return new objects and do not mutate input payloads.
- Existing analyzer and Mermaid behavior remains unchanged.
- Tests cover valid and invalid contract payloads, normalization, API success/failure envelopes, and embedding existing `PlanningAnalysis`, `FlowDraft`, and `MermaidDocument`.
- The PRD Phase 1 row is marked `in-progress` when this plan is created and `complete` only after implementation validation passes.

## Risks and Notes

- Risk: `planningSchema.ts` can become too large. Mitigation: keep schemas there for source-of-truth exports, but move helper logic to `planningContracts.ts`.
- Risk: API envelopes may be overdesigned before a real server exists. Mitigation: define only the concrete envelopes needed by the PRD endpoint table.
- Risk: Future NestJS DTOs may not reuse Zod directly. Mitigation: keep Zod as the current contract source of truth and document where NestJS validation would adapt later.
- Risk: Future AI output schemas may require stricter validation than current frontend data. Mitigation: include validation report and state-machine schemas now, but leave LangGraph and model output parsing to Phase 3.
- Note: `pnpm-lock.yaml` is currently untracked in the worktree and is unrelated to this plan.
