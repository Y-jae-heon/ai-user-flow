# Backend Orchestration AI Extraction Workflow Plan

## Summary

Implement Phase 3 of the backend orchestration PRD: add an OpenAI ChatGPT-backed AI extraction workflow to the existing NestJS backend. The workflow will accept an existing planning session payload, run bounded structured extraction, analyze dependencies and contradictions, map extracted units into backend entities, validate every model output with Zod, and return a `PlanningSessionSnapshot` that remains compatible with the current frontend contract.

User story: as a product planner, I submit rough MVP planning text and nine planning elements, then receive structured actors, objects, actions, rules, assumptions, suggestions, contradictions, dependency analysis, and entity mappings without needing to debug raw AI output.

## Metadata

- Complexity: High
- Source PRD: `.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md`
- PRD phase: `3. AI extraction workflow`
- Plan artifact: `.codex/PRPs/plans/backend-orchestration-ai-extraction-workflow.plan.md`
- Estimated files: 12-16 files
- Primary runtime: NestJS TypeScript backend
- AI provider: OpenAI API using the ChatGPT model family; configure model via environment, defaulting to the current ChatGPT API model documented by OpenAI when the implementation begins.

## UX Design

N/A for visible layout. API behavior changes only:

- Before: `POST /api/planning-sessions` returns normalized input, completeness, empty `analysis`, empty `dependencyAnalysis`, and empty `entities`.
- After Phase 3: `POST /api/planning-sessions/:sessionId/analyze` returns a full `PlanningSessionSnapshot` with `status` set to `ready_for_generation` on success, or `needs_clarification` when completeness, prompt-injection, schema validation, or blocking contradictions prevent generation.
- Existing frontend panels must remain hydratable because the response shape mirrors `planningSessionSnapshotSchema`.

## Mandatory Reading

- `.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:391` - implementation phase table, where Phase 3 is the next pending phase.
- `.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:380` - security and safety requirements for prompt isolation, schema validation, redaction, rate limits, and safe errors.
- `src/features/planning/planningSchema.ts:141` - frontend `planningAnalysisSchema`; backend output must align with this shape.
- `src/features/planning/planningSchema.ts:153` - dependency and entity mapping schemas already defined on the frontend.
- `apps/backend/src/planning/dto/planning.dto.ts:60` - backend analysis schema currently uses `z.unknown()` placeholders and must be tightened.
- `apps/backend/src/planning/planning.service.ts:36` - session creation currently normalizes input and returns a snapshot without analysis.
- `apps/backend/src/planning/planning.validator.ts:65` - prompt-injection check must run before AI calls.
- `apps/backend/src/planning/planning.validator.ts:130` - validation reports already merge multiple checks into one report.
- `apps/backend/src/planning/planning.controller.ts:13` - controller currently exposes create-session and Mermaid validation only.
- `apps/backend/src/planning/planning.module.ts:7` - module providers are the place to add OpenAI/LangGraph adapters.
- `apps/backend/src/config/app.config.ts:6` - app config currently reads env values directly and needs OpenAI config validation.
- `apps/backend/test/planning.e2e-spec.ts:48` - existing e2e test for creating a session with nine planning elements.

## External Documentation Findings

- OpenAI Structured Outputs: use Responses API structured outputs with JavaScript/Zod helpers for schema-constrained extraction; prefer Structured Outputs over JSON mode because JSON mode does not guarantee schema adherence. Source: [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs?api-mode=responses&lang=javascript).
- OpenAI Responses API: the Responses endpoint is the current advanced API surface for text/JSON outputs and tool-using workflows. Source: [OpenAI Responses API reference](https://platform.openai.com/docs/api-reference/responses/object?lang=node.js).
- OpenAI model selection: OpenAI documents the ChatGPT API model as `gpt-5.2-chat-latest` at the time of this plan lookup. Keep the model in `OPENAI_MODEL` so future model changes do not require code edits. Source: [OpenAI latest model guide](https://platform.openai.com/docs/guides/latest-model).
- LangGraph.js: `StateGraph` is the official JS building block for stateful graphs. Use it only to coordinate deterministic nodes and the AI extraction node, not as an unbounded agent. Source: [LangGraph overview](https://docs.langchain.com/oss/javascript/langgraph).
- LangGraph recursion limits: graph invocations can hit `GRAPH_RECURSION_LIMIT`; the implementation must set an explicit low recursion limit and should treat unexpected loops as failed workflow state. Source: [LangGraph GRAPH_RECURSION_LIMIT](https://docs.langchain.com/oss/javascript/langgraph/GRAPH_RECURSION_LIMIT).
- NestJS custom providers: use provider tokens with `useFactory`/`useValue` so tests can replace OpenAI and graph dependencies cleanly. Source: [NestJS custom providers](https://docs.nestjs.com/fundamentals/custom-providers).
- Package registry check on 2026-04-29: `openai` latest observed via npm was `6.35.0`; `@langchain/langgraph` latest observed via npm was `1.2.9`. Install exact or caret versions deliberately and re-check before implementation if the lockfile changes.

## Patterns To Mirror

### Zod validation before business logic

Source: `apps/backend/src/planning/planning.service.ts:36`

```ts
const parsedInput = safeParseWithMessages(planningInputSchema, input)
if (!parsedInput.ok) {
  throwValidationError(parsedInput.errors)
}
```

Mirror this for every AI request payload and every AI response payload. The model output must never flow into entity mapping, session snapshot creation, or future Mermaid generation before Zod parsing passes.

### Validation report composition

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

AI extraction should add schema and workflow validation reports into this same merge path rather than inventing a parallel error format.

### Immutable snapshot creation

Source: `apps/backend/src/planning/planning.service.ts:113`

```ts
return planningSessionSnapshotSchema.parse({
  id: `session_${randomUUID()}`,
  version: CONTRACT_VERSION,
  status: completeness.isSufficient && validation.promptInjectionCheck !== 'failed' ? 'input_received' : 'needs_clarification',
  input,
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
  validation: {
    ...validation,
    jsonSchema: validation.jsonSchema === 'skipped' ? 'passed' : validation.jsonSchema
  },
  flowDraft: null,
  mermaidDocument: null
})
```

Create a new analyzed snapshot from the existing snapshot and parsed extraction result. Do not mutate the original object in-place.

### Frontend analysis semantics

Source: `src/features/planning/planningAnalyzer.ts:42`

```ts
export function analyzePlanningInput(rawText: string): PlanningAnalysis {
  const normalizedText = normalizeText(rawText)
  const lines = tokenizeLines(normalizedText)
  const personas = uniqueLimited(extractPersonas(lines))
  const problemSignals = extractByKeywords(lines, PROBLEM_KEYWORDS)
  const actions = uniqueLimited(extractActions(lines))
  const states = uniqueLimited(extractByKeywords(lines, STATE_KEYWORDS))
```

The AI workflow should improve extraction depth, but the resulting fields must preserve the current mental model: personas, entities, actions, states, assumptions, suggestions, contradictions, and completeness.

## Files To Change

- `apps/backend/package.json` - add `openai` and `@langchain/langgraph` dependencies.
- `apps/backend/package-lock.json` or workspace lockfile used by the backend - update via package manager, preserving existing package-manager expectations.
- `apps/backend/src/config/app.config.ts` - add `OPENAI_API_KEY`, `OPENAI_MODEL`, timeout, and retry configuration parsing.
- `apps/backend/src/planning/dto/planning.dto.ts` - replace `z.unknown()` placeholders with strict schemas matching frontend contracts plus AI extraction request/result schemas.
- `apps/backend/src/planning/planning.ai-client.ts` - new OpenAI adapter with a mockable provider token.
- `apps/backend/src/planning/planning.ai-schemas.ts` - optional new file for OpenAI structured-output schemas if `planning.dto.ts` becomes too large.
- `apps/backend/src/planning/planning.workflow.ts` - new LangGraph orchestration service or factory.
- `apps/backend/src/planning/planning.extraction.service.ts` - new service that coordinates validation, workflow invocation, fallback, and snapshot creation.
- `apps/backend/src/planning/planning.service.ts` - delegate `analyzePlanningSession` to extraction service and reuse existing snapshot helpers where practical.
- `apps/backend/src/planning/planning.controller.ts` - add `POST /api/planning-sessions/:sessionId/analyze`.
- `apps/backend/src/planning/planning.module.ts` - register OpenAI client, workflow, and extraction service providers.
- `apps/backend/src/planning/*.spec.ts` - unit tests for DTOs, AI client, workflow, extraction service, validator additions.
- `apps/backend/test/planning.e2e-spec.ts` - e2e tests for analysis success, prompt-injection skip, schema failure fallback, and blocking contradiction.
- `.codex/PRPs/reports/backend-orchestration-ai-extraction-workflow-report.md` - implementation report after Phase 3 is complete.

## NOT Building

- Mermaid generation, typed flow draft generation, or server-side rendered SVG; Phase 4 owns this.
- Redis, idempotency keys, retry counters across process restarts, audit logs, and rate limiting; Phase 5 owns these.
- Frontend API integration; Phase 6 owns this.
- User authentication or signed session persistence.
- RAG/template retrieval. Keep extraction prompts self-contained for this phase.
- OpenAI tool calling or external function calls. Use structured output only.
- A generic provider registry. This plan targets OpenAI ChatGPT per product decision.

## Step-By-Step Tasks

### Task 1 - Tighten Backend DTO Contracts

- ACTION: Replace backend `z.unknown()` analysis/entity placeholders with strict Zod schemas aligned to the frontend schema.
- IMPLEMENT: Port `qaHandoffSchema`, `logicGapSuggestionSchema`, `planningAssumptionSchema`, `contradictionSchema`, `dependencyAnalysisItemSchema`, `planningActorSchema`, `planningObjectSchema`, `planningActionSchema`, `businessRuleSchema`, and `exceptionPathSchema` from `src/features/planning/planningSchema.ts:50`.
- MIRROR: Keep backend names and enum values identical to `src/features/planning/planningSchema.ts:141` and `src/features/planning/planningSchema.ts:153`.
- IMPORTS: `z` from `zod`; existing exported backend DTO types.
- GOTCHA: Do not import frontend files into the backend app. Duplicate the schema contract for now, or create a shared package in a later refactor.
- VALIDATE: `npm run test -- --runTestsByPath src/planning/dto/planning.dto.spec.ts` from `apps/backend`.

### Task 2 - Add OpenAI Configuration

- ACTION: Extend config parsing for OpenAI without hardcoding secrets or model strings in service code.
- IMPLEMENT: Add config fields for `openAiApiKey`, `openAiModel`, `openAiTimeoutMs`, and `openAiMaxAttempts`; validate `OPENAI_API_KEY` only when AI extraction is invoked or when an explicit `AI_EXTRACTION_ENABLED=true` flag is set.
- MIRROR: Follow the current `parsePort()` fail-fast style in `apps/backend/src/config/app.config.ts:13`.
- IMPORTS: No new config library unless needed; use small parser helpers.
- GOTCHA: Tests must not require a real `OPENAI_API_KEY`. Use dependency injection and test config overrides.
- VALIDATE: Unit tests for valid defaults, invalid numeric timeout/retry values, and missing API key behavior.

### Task 3 - Install AI Dependencies

- ACTION: Add OpenAI and LangGraph.js dependencies.
- IMPLEMENT: Install `openai` and `@langchain/langgraph` in `apps/backend`; preserve existing lockfile conventions and avoid touching unrelated dependencies.
- MIRROR: Existing backend dependency placement in `apps/backend/package.json:14`.
- IMPORTS: Later code should import `OpenAI` from `openai`; import `StateGraph`, `START`, and `END` from `@langchain/langgraph`.
- GOTCHA: The repo currently has both `package-lock.json` and an untracked `pnpm-lock.yaml`; confirm package-manager choice before committing implementation. Do not delete or rewrite unrelated lockfiles.
- VALIDATE: `npm run typecheck` and `npm run test` from `apps/backend`.

### Task 4 - Create Mockable OpenAI Client Adapter

- ACTION: Wrap OpenAI Responses API structured-output calls behind a narrow `PlanningAiClient` interface.
- IMPLEMENT: New provider token such as `PLANNING_AI_CLIENT`; expose `extractPlanningLogic(input): Promise<PlanningExtractionResult>`.
- MIRROR: Use token/provider style already present for Mermaid parser in `apps/backend/src/planning/planning.module.ts:13`.
- IMPORTS: `OpenAI` from `openai`; `zodTextFormat` from `openai/helpers/zod`; strict Zod extraction schema from Task 1.
- GOTCHA: User planning text must be passed as delimited user content. The system/developer prompt must never concatenate raw user text into instructions.
- VALIDATE: Unit tests mock the OpenAI SDK and assert the adapter sends `text.format` structured output, configured model, and no raw user text inside system instructions.

### Task 5 - Define Extraction Result Schema

- ACTION: Create a single strict `planningExtractionResultSchema` that contains all AI-generated units needed by Phase 3.
- IMPLEMENT: Include `analysis`, `dependencyAnalysis`, `entities`, `statusRecommendation`, `blockingReasons`, and `modelMetadata` fields. `analysis` must parse with `planningAnalysisSchema`; `dependencyAnalysis` with `dependencyAnalysisItemSchema[]`; `entities` with `planningEntityMappingSchema`.
- MIRROR: Session snapshot target shape at `apps/backend/src/planning/dto/planning.dto.ts:149`.
- IMPORTS: Reuse backend DTO schemas, not ad hoc TypeScript interfaces.
- GOTCHA: Keep IDs deterministic and Mermaid-safe enough for future phases: lowercase snake-case, stable prefixes (`actor_`, `object_`, `action_`, `rule_`, `exception_`), and max label lengths. Add validator helpers if the schema alone cannot express this cleanly.
- VALIDATE: DTO tests reject missing arrays, invalid enum values, unknown keys, invalid IDs, and oversized labels.

### Task 6 - Build Bounded LangGraph Workflow

- ACTION: Add a small LangGraph workflow for Phase 3: normalize, guard, completeness, extraction, schema validation, dependency/entity post-processing, final snapshot decision.
- IMPLEMENT: Use nodes equivalent to `NormalizeInputNode`, `CompletenessNode`, `ExtractionNode`, `DependencyNode`, `ContradictionNode`, and `EntityMappingNode`; compile a graph with explicit terminal states.
- MIRROR: PRD workflow states at `.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:249`.
- IMPORTS: `StateGraph`, `START`, `END` from `@langchain/langgraph`.
- GOTCHA: Set a low explicit recursion limit when invoking the graph. This phase should be a bounded pipeline with at most one AI extraction attempt and one deterministic fallback, not a self-correcting loop.
- VALIDATE: Workflow unit tests prove prompt-injection input skips OpenAI, malformed AI output returns `needs_clarification`, and successful extraction returns `ready_for_generation`.

### Task 7 - Implement Deterministic Fallback Extraction

- ACTION: Provide a local fallback when OpenAI is unavailable, times out, refuses, or returns schema-invalid output.
- IMPLEMENT: Port or adapt the frontend deterministic analyzer behavior from `src/features/planning/planningAnalyzer.ts:42` into backend-safe helpers, then map those results into strict backend schemas with lower confidence and fallback validation errors.
- MIRROR: Existing frontend suggestions and contradictions from `src/features/planning/planningAnalyzer.ts:216` and `src/features/planning/planningAnalyzer.ts:337`.
- IMPORTS: Backend DTO schemas and `createFailedReport`/`createPassedReport`.
- GOTCHA: Fallback must not claim AI confidence. Use `confidence: "low"` or `"medium"` and include a user-safe validation error such as `AI extraction unavailable; deterministic fallback used.`
- VALIDATE: Unit tests simulate OpenAI timeout and schema failure, then assert fallback output still parses as a `PlanningSessionSnapshot`.

### Task 8 - Add Analyze Endpoint And Service Integration

- ACTION: Add `POST /api/planning-sessions/:sessionId/analyze`.
- IMPLEMENT: Accept a request body containing a full session snapshot or the original planning input plus optional `modelConfig` only if needed for tests. For this no-persistence phase, use the supplied payload as the session source instead of looking up Redis.
- MIRROR: Controller delegation style at `apps/backend/src/planning/planning.controller.ts:8`; response envelope style from `apps/backend/src/common/api-envelope.ts`.
- IMPORTS: `Param`, `Body`, `Post`; `PlanningExtractionService`.
- GOTCHA: Because Phase 5 owns persistence, do not pretend `sessionId` is stored. Validate that the route param matches the supplied snapshot id when a snapshot is supplied; otherwise return a validation error.
- VALIDATE: E2E test for `POST /api/planning-sessions/session_test/analyze` with a mocked AI client returning strict extraction.

### Task 9 - Expand Validation And Safety Tests

- ACTION: Cover safety, schema, and state decisions before implementation is considered complete.
- IMPLEMENT: Add tests for prompt-injection blocking before AI invocation, raw Mermaid/directive attempts in user text, OpenAI refusal/schema invalid response, deterministic fallback, entity referential integrity, and blocking contradiction status.
- MIRROR: Existing E2E style in `apps/backend/test/planning.e2e-spec.ts:90`.
- IMPORTS: `@nestjs/testing`, `supertest`, provider overrides for `PLANNING_AI_CLIENT`.
- GOTCHA: Do not snapshot full AI responses. Assert stable contract fields and ID prefixes.
- VALIDATE: `npm run test`, `npm run test:e2e`, and `npm run typecheck` from `apps/backend`.

### Task 10 - Write Phase Report And Update PRD Status

- ACTION: After implementation and validation, write the Phase 3 report and update the PRD phase status to `complete`.
- IMPLEMENT: Create `.codex/PRPs/reports/backend-orchestration-ai-extraction-workflow-report.md` with changed files, test commands, known limitations, and next phase handoff.
- MIRROR: Existing report naming under `.codex/PRPs/reports/`.
- IMPORTS: N/A.
- GOTCHA: Documentation-only report does not require `graphify update .`, but code changes do.
- VALIDATE: Re-read the PRD phase table and confirm Phase 4 remains pending.

## Testing Strategy

- Unit tests:
  - DTO schema tests for strict output contracts and unknown-key rejection.
  - OpenAI adapter tests with mocked SDK responses.
  - Workflow tests for success, prompt-injection skip, model failure fallback, and schema-invalid fallback.
  - Entity mapping tests for actor/object/action referential integrity.
- Integration tests:
  - `PlanningExtractionService` tests with mocked `PlanningAiClient`.
  - Controller tests or E2E tests with provider overrides.
- E2E tests:
  - Create a session, then analyze it through `POST /api/planning-sessions/:sessionId/analyze`.
  - Verify frontend-compatible fields: `analysis`, `dependencyAnalysis`, `entities`, `validation`, and `status`.
- Coverage:
  - Maintain the project requirement of 80%+ coverage for changed backend code.

## Validation Commands

Run from `apps/backend` unless noted:

```bash
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

Run from repo root after code changes:

```bash
graphify update .
```

Optional security/dependency validation before commit:

```bash
npm audit --omit=dev
```

## Acceptance Criteria

- Backend exposes `POST /api/planning-sessions/:sessionId/analyze`.
- Endpoint returns `success: true` with a strict `PlanningSessionSnapshot` on valid input.
- OpenAI ChatGPT extraction uses Responses API Structured Outputs and validates with Zod before use.
- Prompt-injection language prevents AI invocation and returns `needs_clarification`.
- OpenAI timeout/refusal/schema failure produces a deterministic fallback snapshot or a user-safe validation error; no raw SDK errors leak to clients.
- Extracted dependencies use only allowed planning element keys and dependency types.
- Entity mappings contain actors, objects, actions, business rules, and exception paths with valid references.
- Blocking contradictions set snapshot status to `needs_clarification`; otherwise successful extraction sets `ready_for_generation`.
- Tests cover unit, integration, and E2E paths, and backend typecheck/build pass.
- PRD Phase 3 is marked complete only after implementation validation and report creation.

## Risks And Notes

- OpenAI model availability changes over time. Mitigation: keep `OPENAI_MODEL` configurable and cite the model used in the implementation report.
- Structured Outputs support a subset of JSON Schema. Mitigation: keep schemas simple, avoid unsupported JSON Schema features in the OpenAI-facing schema, and run Zod validation after parsing.
- LangGraph can create accidental loops. Mitigation: use a linear graph, explicit terminal edges, and an explicit recursion limit.
- No persistence exists yet. Mitigation: make the analyze endpoint accept the session snapshot/input payload in this phase and document that Phase 5 will replace this with Redis-backed lookup.
- Duplicated frontend/backend schemas can drift. Mitigation: add contract tests that parse representative frontend-compatible payloads and consider a shared schema package in a later refactor.
- Current repo has an untracked `pnpm-lock.yaml`. Mitigation: do not alter or remove it unless the implementation owner confirms package-manager migration.

