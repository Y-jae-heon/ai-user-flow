# Backend Orchestration State Machine and Mermaid Generation Plan

## Summary

Implement Phase 4 of the backend orchestration PRD: move typed flow-draft creation, state-machine mapping, nested Mermaid serialization, safety validation, parser validation, and bounded deterministic correction into the NestJS backend.

User story: as a product planner, I submit rough MVP notes, receive backend-extracted planning logic, then request a render-safe Mermaid document with a typed editable `FlowDraft`, explicit state transitions, recovery paths, validation status, and blocked reasons when generation is unsafe.

## Metadata

- Complexity: High
- Source PRD: `.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md`
- PRD phase: `4. State-machine and Mermaid generation`
- Plan artifact: `.codex/PRPs/plans/backend-orchestration-state-machine-mermaid-generation.plan.md`
- Estimated files: 10-14 files
- Primary runtime: NestJS TypeScript backend
- Current baseline: Phase 1-3 backend code exists; frontend generation remains local.

## UX Design

N/A for visible layout. API behavior changes only:

- Before: backend can create sessions, analyze planning logic, and validate user-supplied Mermaid code.
- After Phase 4: backend exposes `POST /api/planning-sessions/:sessionId/mermaid` to return the updated `PlanningSessionSnapshot` or a generation payload containing `flowDraft`, `mermaidDocument`, and `validation`.
- Frontend panels must remain hydratable because `flowDraft`, `mermaidDocument`, `analysis`, `entities`, `dependencyAnalysis`, and `validation` keep the same schema as `src/features/planning/planningSchema.ts`.

## Mandatory Reading

- `.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:77` - Must Have requirements for state machines, nested subgraphs, safe node IDs, cycle detection, and response compatibility.
- `.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:249` - required session state machine states and allowed transitions.
- `.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:321` - Mermaid generation rules for `flowchart TD`, ID normalization, label escaping, subgraphs, and cycle limits.
- `.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:333` - endpoint table, especially `POST /api/planning-sessions/{sessionId}/mermaid`.
- `.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:367` - AI orchestration workflow nodes; Phase 4 owns `StateMachineNode`, `MermaidDraftNode`, `ValidationNode`, and deterministic correction.
- `graphify-out/GRAPH_REPORT.md:22` - current god nodes and backend clusters: `PlanningValidator`, `createMermaidDraft()`, `PlanningService`, and `MermaidSyntaxService`.
- `apps/backend/src/planning/dto/planning.dto.ts:190` - backend state-machine, flow-draft, Mermaid document, session snapshot, and analysis request schemas.
- `apps/backend/src/planning/planning.service.ts:56` - `analyzePlanningSession()` currently returns an analyzed snapshot but generation is not wired.
- `apps/backend/src/planning/planning.service.ts:74` - `validateMermaid()` already composes Mermaid safety and parser validation.
- `apps/backend/src/planning/planning.validator.ts:90` - `validateFlowDraftShape()` validates ID shape, labels, missing sections/nodes, and cycles.
- `apps/backend/src/planning/mermaid-syntax.service.ts:23` - parser-only Mermaid validation with strict security config.
- `apps/backend/src/planning/planning.controller.ts:18` - only validation exists under `/mermaid`; add generation beside it.
- `src/features/planning/mermaidGenerator.ts:24` - frontend generation semantics to mirror on the backend.
- `src/features/planning/mermaidGenerator.ts:115` - frontend Mermaid serializer for subgraphs, node shapes, edges, and quote escaping.
- `src/features/planning/mermaidGenerator.test.ts:29` - existing generation acceptance tests.

## External Documentation Findings

- Mermaid flowcharts support explicit subgraphs with `subgraph ... end`, explicit subgraph IDs, and links to/from subgraphs; keep output on basic flowchart syntax for parser stability. Source: [Mermaid Flowcharts Syntax](https://mermaid.js.org/syntax/flowchart.html).
- Mermaid documents can quote labels to handle special characters, and entity codes such as `&quot;` are valid escaping tools. Source: [Mermaid Flowcharts Syntax](https://mermaid.js.org/syntax/flowchart.html).
- Mermaid supports many newer v11 flowchart shapes, icons, images, edge IDs, animation, and renderer config; Phase 4 should avoid these because the PRD blocks renderer directives and wants stable render-safe code. Source: [Mermaid Flowcharts Syntax](https://mermaid.js.org/syntax/flowchart.html).
- LangGraph.js recursion limits should be explicit for iterative graphs; cycles likely indicate infinite-loop logic unless deliberately bounded. Phase 4 deterministic correction should use a hard retry count and should not rely on unbounded graph recursion. Source: [LangGraph GRAPH_RECURSION_LIMIT](https://docs.langchain.com/oss/javascript/langgraph/errors/GRAPH_RECURSION_LIMIT).
- OpenAI Structured Outputs are preferable to JSON mode for schema adherence, but Phase 4 should not add a second model call unless deterministic correction cannot meet parser validation. Current Phase 3 already uses structured extraction. Source: [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

## Patterns To Mirror

### API envelope stays uniform

Source: `apps/backend/src/common/api-envelope.ts:20`

```ts
export function createSuccessEnvelope<TData>(data: TData): ApiSuccessEnvelope<TData> {
  return {
    success: true,
    data,
    error: null
  }
}
```

Mermaid generation should return this envelope style. Do not introduce an endpoint-specific response wrapper.

### Immutable session updates

Source: `apps/backend/src/planning/planning.extraction.service.ts:66`

```ts
return planningSessionSnapshotSchema.parse({
  ...snapshot,
  status: nextStatus,
  analysis: extraction.analysis,
  dependencyAnalysis: extraction.dependencyAnalysis,
  entities: extraction.entities,
  validation: nextValidation
})
```

Generation should create a new snapshot with `status`, `stateMachine`, `flowDraft`, `mermaidDocument`, and merged `validation`. Do not mutate the supplied snapshot.

### Existing frontend generation behavior

Source: `src/features/planning/mermaidGenerator.ts:24`

```ts
export function generateMermaidFlow({ analysis, suggestions }: GenerateMermaidFlowInput): MermaidDocument {
  if (!analysis.completeness.isSufficient) {
    return createBlockedDocument('Minimum planning information is required before Mermaid generation.')
  }

  const blockingContradiction = analysis.contradictions.find((contradiction) => contradiction.severity === 'blocking')
  if (blockingContradiction) {
    return createBlockedDocument(`Resolve blocking contradiction first: ${blockingContradiction.title}`)
  }
```

Mirror these blocking conditions on the backend before generating state machines or Mermaid strings.

### Flow draft before Mermaid string

Source: `src/features/planning/mermaidGenerator.ts:34`

```ts
const draft = createMermaidDraft({ analysis, suggestions })
const code = serializeMermaidDraft(draft)
```

Backend generation must create and validate a typed `FlowDraft` first, then serialize. Do not repair arbitrary user Mermaid text inside the generation path.

### Validator composition

Source: `apps/backend/src/planning/planning.validator.ts:130`

```ts
return planningValidationReportSchema.parse({
  jsonSchema: mergeStatus(reports.map((report) => report.jsonSchema)),
  mermaidSyntax: mergeStatus(reports.map((report) => report.mermaidSyntax)),
  cycleCheck: mergeStatus(reports.map((report) => report.cycleCheck)),
  promptInjectionCheck: mergeStatus(reports.map((report) => report.promptInjectionCheck)),
  retryCount: Math.max(0, ...reports.map((report) => report.retryCount)),
  errors: reports.flatMap((report) => report.errors)
})
```

State-machine validation, flow-draft validation, Mermaid safety, parser validation, and correction attempts should merge into this report.

## Files To Change

- `apps/backend/src/planning/dto/planning.dto.ts` - add Mermaid generation request/response schemas if needed, tighten state/transition IDs to safe IDs, export request types.
- `apps/backend/src/planning/planning.state-machine.service.ts` - new deterministic state-machine builder from analyzed session data.
- `apps/backend/src/planning/planning.mermaid-generator.service.ts` - new typed flow-draft builder, serializer, blocked-document creation, and deterministic correction coordinator.
- `apps/backend/src/planning/planning.service.ts` - add `generateMermaid()` orchestration and snapshot update.
- `apps/backend/src/planning/planning.controller.ts` - add `POST /api/planning-sessions/:sessionId/mermaid`.
- `apps/backend/src/planning/planning.module.ts` - register new services.
- `apps/backend/src/planning/planning.validator.ts` - add or adjust state-machine and Mermaid generation validation helpers only where existing helpers are insufficient.
- `apps/backend/src/planning/*.spec.ts` - focused unit tests for state-machine generation, flow-draft serialization, service orchestration, blocked cases, parser-failure fallback, and controller/e2e behavior.
- `apps/backend/test/planning.e2e-spec.ts` - add API coverage for analyze-to-mermaid happy path and blocked generation.
- `src/features/planning/mermaidGenerator.ts` - no change required in Phase 4 unless a shared package is introduced; avoid broad frontend edits.
- `.codex/PRPs/reports/backend-orchestration-state-machine-mermaid-generation-report.md` - implementation report after Phase 4 is complete.

## NOT Building

- Redis sessions, idempotency, retry counters across process restarts, audit logs, and rate limiting; Phase 5 owns these.
- Frontend replacement of local analysis/generation calls; Phase 6 owns this.
- Server-rendered SVG/PNG export.
- Collaborative editing, persistence, authentication, billing, or workspaces.
- RAG/template packs.
- Generic Mermaid grammar parser beyond the existing official Mermaid parser adapter.
- AI-based Mermaid repair by default. Keep Phase 4 deterministic unless a later decision explicitly adds model repair.

## Step-By-Step Tasks

### Task 1 - Add Mermaid Generation DTOs

- ACTION: Define strict request and response schemas for backend Mermaid generation.
- IMPLEMENT: Add `mermaidGenerationRequestSchema` accepting either `session: planningSessionSnapshotSchema` or enough session data to generate from the current analyzed snapshot. Include optional `acceptedSuggestionIds` or `suggestions` only if the existing snapshot cannot represent accepted/rejected suggestions cleanly.
- MIRROR: Keep `mermaidGenerationResponseSchema` compatible with `src/features/planning/planningSchema.ts:299`: `{ flowDraft, mermaidDocument, validation }`.
- IMPORTS: Existing `flowDraftSchema`, `mermaidDocumentSchema`, `planningValidationReportSchema`, `planningSessionSnapshotSchema`.
- GOTCHA: Avoid widening the frontend contract with backend-only fields unless they are nullable or isolated to the request schema.
- VALIDATE: DTO tests parse valid generation requests, reject route/session ID mismatches, reject unknown keys, and prove response compatibility with frontend schemas.

### Task 2 - Build State Machine Service

- ACTION: Create a deterministic `PlanningStateMachineService` that maps analyzed snapshots into `PlanningStateMachine`.
- IMPLEMENT: Use the PRD states as the baseline: `input_received`, `parsing`, `needs_clarification`, `mapping_logic`, `generating_mermaid`, `validating_output`, `self_correcting`, `ready`, and `failed`; include `unauthenticated`/`authenticated` only when the current session model exposes auth context, otherwise document them as future Phase 5 states.
- MIRROR: PRD state definitions at `.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:249`.
- IMPORTS: `planningStateMachineSchema`, `PlanningSessionSnapshot`, `PlanningStateMachine`.
- GOTCHA: `PlanningValidator.validateGraphCycles()` allows retry transitions only when `isRetry: true` and `to` is in `input_received`, `validating_output`, or `generating_mermaid`; set retry metadata deliberately.
- VALIDATE: Unit tests cover sufficient input, blocking contradiction, parser retry path, and unsafe cycle rejection.

### Task 3 - Port Backend Flow Draft Builder

- ACTION: Create a backend `PlanningMermaidGeneratorService` that builds `FlowDraft` from `analysis`, accepted suggestions, entities, exception paths, and state-machine transitions.
- IMPLEMENT: Start from frontend `createMermaidDraft()` behavior, then extend sections to match the PRD groups: input, analysis, state machine, generation, validation, output. Add nodes for extracted actors/actions/states, business rules, exception paths, and recovery paths.
- MIRROR: `src/features/planning/mermaidGenerator.ts:46` for stable sections, list nodes, accepted suggestion handling, and happy-path bias.
- IMPORTS: Backend DTO types `FlowDraft`, `FlowNode`, `FlowEdge`, `PlanningAnalysis`, `PlanningSessionSnapshot`.
- GOTCHA: Existing validator only whitelists specific frontend retry edge keys (`completeness->input_text`, `contradiction_check->input_text`, `render_check->generate_code`). Either reuse these IDs or update the whitelist with documented Phase 4 retry IDs and tests.
- VALIDATE: Unit tests assert deterministic node IDs, required sections, recovery nodes, accepted/rejected suggestion behavior, no missing references, and `validateFlowDraftShape()` passing.

### Task 4 - Implement Safe Mermaid Serialization

- ACTION: Serialize validated `FlowDraft` to `flowchart TD` Mermaid code with subgraphs and escaped labels.
- IMPLEMENT: Port `serializeMermaidDraft()`, `serializeNode()`, `serializeEdge()`, and label escaping, then add length limiting and Mermaid-sensitive character normalization before Zod validation.
- MIRROR: `src/features/planning/mermaidGenerator.ts:115` and PRD generation rules at `.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:321`.
- IMPORTS: Backend `FlowDraft`, `FlowNode`, `FlowEdge`, `mermaidDocumentSchema`.
- GOTCHA: Keep syntax conservative: no Mermaid init directives, HTML labels, markdown strings, edge IDs, animations, icons, images, or renderer config.
- VALIDATE: Tests cover quotes, brackets, parentheses, Korean labels, unsafe markup removal, long labels, and exact `subgraph section_id["Label"]` output.

### Task 5 - Add Generation Blocking Rules

- ACTION: Block generation before Mermaid serialization when the session is not safe to generate.
- IMPLEMENT: Return a `MermaidDocument` with `renderStatus: 'blocked'`, empty `code`, and a user-safe `blockedReason` when analysis is missing, completeness is insufficient, prompt-injection failed, blocking contradictions exist, or status is not `ready_for_generation`/`ready`.
- MIRROR: frontend blocked-document behavior at `src/features/planning/mermaidGenerator.ts:24`.
- IMPORTS: `mermaidDocumentSchema`, `createPassedReport`, `createFailedReport`.
- GOTCHA: Blocked generation is a valid response, not a thrown validation exception, unless the request shape itself is invalid.
- VALIDATE: Service tests assert blocked documents for missing analysis, incomplete analysis, blocking contradiction, and prompt-injection failure.

### Task 6 - Validate Draft, State Machine, Safety, and Parser Output

- ACTION: Compose full validation before returning backend-generated Mermaid.
- IMPLEMENT: Validate state machine with `validateGraphCycles()`, flow draft with `validateFlowDraftShape()`, Mermaid string with `validateMermaidSafety()`, and parser syntax with `MermaidSyntaxService.validateSyntax()`.
- MIRROR: `apps/backend/src/planning/planning.service.ts:80` for safety-before-parser ordering.
- IMPORTS: `PlanningValidator`, `MermaidSyntaxService`, `createPassedReport`, `createFailedReport`.
- GOTCHA: If safety fails, skip parser validation to avoid invoking Mermaid on unsafe code. If draft validation fails, do not serialize.
- VALIDATE: Unit tests verify report merging, parser skip on unsafe code, failed cycle behavior, and `retryCount` propagation.

### Task 7 - Add Bounded Deterministic Correction

- ACTION: Add one deterministic correction pass for backend-generated code when parser validation fails.
- IMPLEMENT: Rebuild Mermaid from the same typed draft after applying label normalization and reserved-word fixes, then validate again. Limit to `MAX_MERMAID_CORRECTION_ATTEMPTS = 1`.
- MIRROR: Frontend renderer currently performs one correction attempt as noted in `.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:13`; backend should keep the same bounded behavior.
- IMPORTS: Existing validator and syntax service.
- GOTCHA: Correction should never accept user-provided Mermaid directives or arbitrary replacement text. The source of truth remains the typed draft.
- VALIDATE: Mock parser fails once then passes; assert final status `generated`, retry count `1`, and no unbounded loop. Mock parser always fails; assert `renderStatus: 'fallback'` with user-safe `renderError`.

### Task 8 - Wire Service and Controller Endpoint

- ACTION: Expose backend generation at `POST /api/planning-sessions/:sessionId/mermaid`.
- IMPLEMENT: Add `PlanningService.generateMermaid(sessionId, body)` that parses the request, verifies route/session ID match, delegates state-machine and generator services, merges validation, and returns an updated snapshot or `{ flowDraft, mermaidDocument, validation }` envelope.
- MIRROR: Controller style in `apps/backend/src/planning/planning.controller.ts:13` and envelope style in `apps/backend/src/common/api-envelope.ts:20`.
- IMPORTS: New DTO request schema, `PlanningStateMachineService`, `PlanningMermaidGeneratorService`.
- GOTCHA: Decide response shape once and test it. Prefer returning a full `PlanningSessionSnapshot` if frontend hydration is the main path; if returning generation payload, ensure snapshot update remains possible in Phase 6.
- VALIDATE: Unit tests for route/session mismatch, happy path, blocked path, parser failure fallback, and envelope shape.

### Task 9 - Add E2E and Contract Tests

- ACTION: Cover the full backend path from session creation/analyze output to Mermaid generation.
- IMPLEMENT: Add e2e tests with mocked AI extraction and mocked Mermaid parser adapter. Include a sufficient planning input, accepted recovery suggestion, and a parser-failure scenario.
- MIRROR: Existing backend e2e and unit test style; keep tests deterministic and avoid real OpenAI calls.
- IMPORTS: Nest testing utilities, Supertest, backend DTO schemas.
- GOTCHA: The current module registers `MERMAID_PARSER_ADAPTER` with `null`; tests may need provider overrides rather than relying on runtime Mermaid availability.
- VALIDATE: `npm run backend:test`, `npm run backend:test:e2e`, and `npm run backend:typecheck`.

### Task 10 - Write Implementation Report and Update Graph

- ACTION: Leave traceable implementation evidence after coding.
- IMPLEMENT: Create `.codex/PRPs/reports/backend-orchestration-state-machine-mermaid-generation-report.md` with summary, changed files, validation results, residual risks, and next phase recommendation. Run `graphify update .` because code files changed.
- MIRROR: Previous reports referenced in PRD phase rows.
- IMPORTS: N/A.
- GOTCHA: Do not update documentation-only sections with duplicated knowledge unless they record implementation evidence or phase status.
- VALIDATE: Report exists, PRD phase row links to it after implementation completion, and graph update succeeds or failure is documented.

## Testing Strategy

- Unit tests for DTO request/response schemas, state-machine builder, flow-draft builder, serializer, deterministic correction, and validation report merging.
- Service tests for blocked generation, happy-path generation, parser retry success, parser retry fallback, and route/session mismatch.
- Controller/e2e tests for `POST /api/planning-sessions/:sessionId/mermaid` with mocked parser and mocked extraction data.
- Contract tests comparing backend DTOs to frontend `planningSchema.ts` where compatibility is required.
- No real OpenAI, Redis, or external Mermaid rendering calls in unit/e2e tests.

## Validation Commands

Run from repository root unless noted:

```bash
npm run backend:typecheck
npm run backend:test
npm run backend:test:e2e
npm run typecheck
npm run test:run
graphify update .
```

For focused backend iteration from `apps/backend`:

```bash
npm run typecheck
npm run test -- --runTestsByPath src/planning/planning.mermaid-generator.service.spec.ts
npm run test -- --runTestsByPath src/planning/planning.state-machine.service.spec.ts
```

## Acceptance Criteria

- `POST /api/planning-sessions/:sessionId/mermaid` exists and returns a schema-valid success envelope.
- Backend generation produces a typed `FlowDraft` before Mermaid code.
- Generated Mermaid starts with `flowchart TD`, uses nested subgraphs, has safe deterministic node IDs, and escapes user-provided labels.
- Generation includes at least one happy path and uses accepted suggestions/entity exception paths for recovery/secondary paths when available.
- Blocking contradictions, insufficient completeness, missing analysis, and prompt-injection failures return blocked documents instead of unsafe code.
- State-machine transitions are schema-valid and unsafe cycles are rejected.
- Mermaid safety validation runs before parser validation.
- Parser failures trigger at most one deterministic correction attempt.
- Final validation report accurately reflects JSON, Mermaid syntax, cycle, prompt-injection, and retry status.
- Existing backend analysis and Mermaid validation endpoints keep passing.

## Risks and Notes

- The backend and frontend currently duplicate schema definitions. Keep Phase 4 compatible, but defer shared package extraction unless schema drift becomes a blocker.
- Mermaid parser runtime compatibility in Node has known DOMPurify sensitivity in this codebase; keep parser adapter mockable and preserve the existing unavailable-parser failure behavior.
- Existing cycle whitelist is tied to frontend node IDs. Phase 4 should either reuse those IDs or update the whitelist with explicit tests.
- Returning full snapshots vs generation payload affects Phase 6 frontend integration. Prefer the shape that minimizes frontend state reconciliation and document the choice in the report.
- The untracked `pnpm-lock.yaml` pre-exists this planning task. Do not modify or delete it as part of Phase 4 unless the implementation explicitly standardizes package management.
