# Backend Orchestration Phase 2 Plan: NestJS Backend Scaffold and Deterministic Validator

## Summary

Phase 2 creates a separate NestJS backend app and implements the first backend-owned validation API for the AI User Flow Planner. The backend will accept the frontend planning payload, reuse or mirror the Phase 1 Zod contract, normalize the request into a versioned planning session, run deterministic non-AI validation, validate Mermaid syntax with the official Mermaid parser, and return API envelopes compatible with the current frontend contract.

This replaces the earlier narrower interpretation of Phase 2 as a frontend-local validator. The PRD explicitly names NestJS as the recommended TypeScript backend option, and Phase 2 should establish that backend boundary before later AI extraction, state-machine generation, persistence, and frontend integration phases.

## User Story

As a backend developer, I want a standalone NestJS app with deterministic planning and Mermaid validation endpoints, so future AI orchestration can be added behind a stable API boundary without redesigning the current React frontend contract.

## Metadata

- Complexity: High
- Source PRD: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md`
- PRD phase: Phase 2: Deterministic backend validator
- Plan path: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/plans/backend-orchestration-deterministic-validator.plan.md`
- Estimated files: 25-40
- Primary backend code area: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/apps/backend/`
- Shared contract source area: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/`
- Requires frontend work: No runtime UI change in this phase
- Requires backend server work: Yes, NestJS app scaffold and HTTP endpoints
- Requires new dependencies: Yes, NestJS backend dependencies and dev tooling
- Package manager: npm is the tracked lockfile source (`package-lock.json` is tracked). Leave the untracked `pnpm-lock.yaml` untouched unless the user explicitly chooses pnpm.

## UX Design

N/A for visible product UI. The React app should continue using local analysis/generation during Phase 2.

Developer-facing behavior after Phase 2:

- `apps/backend` can run independently on a configurable port.
- Backend exposes health and planning validation endpoints.
- Backend responses use the same success/failure envelope semantics as the frontend contract.
- API responses are suitable for Phase 6 frontend replacement without changing the current readiness, suggestion review, QA handoff, Mermaid output, and export panels.

## Mandatory Reading

Read these before implementation:

- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:5`
  - The problem statement says the current frontend-only heuristics lack backend contract, session state, server-side Mermaid validation, and safety loops.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:19`
  - Proposed solution requires a backend orchestration layer that validates, normalizes, maps units, generates Mermaid, validates output, and returns frontend-compatible data.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:61`
  - Backend developer needs implementation choices that work in FastAPI or NestJS.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:77`
  - Must-have scope includes accepting nine planning elements, session normalization, Mermaid-safe IDs/labels, cycle checks, JSON/Mermaid validation, and frontend-aligned responses.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:333`
  - API endpoint suggestions define the backend route surface.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:356`
  - Backend Option B explicitly names NestJS with Zod/class-validator DTOs, LangGraph.js later, Redis later, and existing Mermaid parser reuse.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:363`
  - Recommended first implementation says to start with NestJS or a TypeScript API route when the frontend remains TypeScript-heavy.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:367`
  - AI orchestration workflow names validation as a node, but AI nodes are later phases.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:380`
  - Security requirements apply to backend request validation and safe errors.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningSchema.ts:7`
  - Existing nine-element contract is the source of truth for request shape.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningSchema.ts:232`
  - `planningValidationReportSchema` is the validation response DTO.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningSchema.ts:254`
  - `planningSessionSnapshotSchema` defines the frontend-compatible planning session snapshot.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningContracts.ts:18`
  - Existing input normalization and session snapshot helper should be mirrored or imported.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/mermaidRenderer.ts:44`
  - Current renderer proves the Mermaid parser/render adapter pattern.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/package.json:6`
  - Current root scripts should remain working after backend scaffold.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/package-lock.json:1`
  - npm lockfile is tracked; dependency changes should update this lockfile, not introduce a second package manager decision.

## External Documentation Findings

- NestJS official docs use modular architecture with controllers, providers, modules, dependency injection, and testing support. Use thin controllers and injectable services. Source: [NestJS first steps](https://docs.nestjs.com/first-steps).
- NestJS validation docs support global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, and `transform`. Use this if class-validator DTOs are used. If using Zod DTO parsing directly, still keep a single global validation/error strategy. Source: [NestJS validation](https://docs.nestjs.com/techniques/validation).
- NestJS testing docs support unit tests with `Test.createTestingModule()` and HTTP tests via Supertest. Use both provider tests and request-level tests for validation endpoints. Source: [NestJS testing](https://docs.nestjs.com/fundamentals/testing).
- Mermaid usage docs state `mermaid.parse(text, parseOptions)` validates syntax without rendering and throws unless `suppressErrors` is true. Use parse-only validation in the backend; do not render SVG in Phase 2. Source: [Mermaid usage](https://mermaid.js.org/config/usage).
- Zod safe parsing provides schema validation without throwing. Use `safeParse` at API boundaries if the backend imports the existing Zod contract. Source: [Zod basics](https://zod.dev/basics).

## Architecture Decision

Use a standalone NestJS app under `apps/backend`.

Recommended structure:

```text
apps/backend/
├── package.json
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── filters/http-exception.filter.ts
│   │   └── validation/zod-validation.ts
│   ├── config/
│   │   └── app.config.ts
│   └── planning/
│       ├── planning.module.ts
│       ├── planning.controller.ts
│       ├── planning.service.ts
│       ├── planning.validator.ts
│       ├── mermaid-syntax.service.ts
│       └── dto/
│           └── planning.dto.ts
└── test/
    └── planning.e2e-spec.ts
```

Prefer Zod as the Phase 2 DTO source because the frontend contract already uses Zod and the PRD prioritizes schema compatibility. Class-validator can be added later if Nest-specific DTO decorators become necessary, but duplicating the frontend contract in class-validator during Phase 2 increases drift.

## Patterns To Mirror

Frontend API envelope:

```ts
export const apiSuccessEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  error: z.null()
})

export const apiFailureEnvelopeSchema = z.object({
  success: z.literal(false),
  data: z.null(),
  error: apiErrorSchema
})
```

Mirror this envelope in backend responses so Phase 6 can switch the frontend to HTTP without changing response semantics.

Existing normalization:

```ts
return planningInputSchema.parse({
  rawText: parsedInput.rawText.trim(),
  ...(normalizedElements && { elements: normalizedElements })
})
```

Backend normalization should preserve this behavior: trim raw text and elements, drop empty element values, and avoid mutating the request object.

NestJS module boundaries:

```ts
@Module({
  controllers: [PlanningController],
  providers: [PlanningService, PlanningValidator, MermaidSyntaxService],
})
export class PlanningModule {}
```

Controllers stay thin, validation/generation logic lives in injectable providers, and common error handling is centralized.

Mermaid parse-only validation:

```ts
const parseResult = await mermaid.parse(code, { suppressErrors: false })
if (parseResult === false) {
  // return mermaidSyntax failed
}
```

Do not call `mermaid.render()` in Phase 2. Server-side SVG/PNG export is out of first backend phase unless needed later for parity.

## Files To Change

- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/package.json`
  - Add workspace-aware scripts for backend install/test/build/start if using npm workspaces, or add root convenience scripts that run `npm --prefix apps/backend ...`.
  - Keep existing frontend scripts unchanged.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/package-lock.json`
  - Update through npm install commands during implementation.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/apps/backend/package.json`
  - New NestJS backend package with scripts: `start`, `start:dev`, `build`, `test`, `test:e2e`, `typecheck`.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/apps/backend/nest-cli.json`
  - Nest build config.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/apps/backend/tsconfig.json`
  - Backend TypeScript config.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/apps/backend/tsconfig.build.json`
  - Backend production build config.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/apps/backend/src/main.ts`
  - Bootstrap Nest app with CORS for local frontend, global error handling, and validated config.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/apps/backend/src/app.module.ts`
  - Import `PlanningModule`.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/apps/backend/src/common/filters/http-exception.filter.ts`
  - Return consistent API failure envelopes and avoid leaking stack traces.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/apps/backend/src/common/validation/zod-validation.ts`
  - Shared Zod `safeParse` helpers for user-safe validation errors.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/apps/backend/src/config/app.config.ts`
  - Port, frontend origin, and environment defaults.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/apps/backend/src/planning/dto/planning.dto.ts`
  - Re-export or mirror `PlanningInput`, response envelope, validation report, and Mermaid validation DTOs from the shared contract.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/apps/backend/src/planning/planning.module.ts`
  - Planning feature module.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/apps/backend/src/planning/planning.controller.ts`
  - Implement endpoints:
    - `GET /health`
    - `POST /api/planning-sessions`
    - `POST /api/planning-sessions/:sessionId/mermaid/validate`
    - Optional Phase 2 placeholder: `GET /api/planning-sessions/:sessionId`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/apps/backend/src/planning/planning.service.ts`
  - Create deterministic session snapshots and validation responses.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/apps/backend/src/planning/planning.validator.ts`
  - Non-AI schema validation, completeness guard, prompt-injection signal check, Mermaid-safe label/directive checks, and graph cycle checks.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/apps/backend/src/planning/mermaid-syntax.service.ts`
  - Parse-only Mermaid syntax validation.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/apps/backend/src/**/*.spec.ts`
  - Provider/controller unit tests.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/apps/backend/test/planning.e2e-spec.ts`
  - HTTP tests for health, session creation, input validation, and Mermaid validation.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md`
  - Keep Phase 2 `in-progress` while implementing; mark complete with report link after implementation.

## NOT Building

- No LangGraph, LLM provider, prompt templates, RAG, AI extraction, or model repair loop. Those start in Phase 3.
- No Redis, BullMQ, idempotency persistence, audit log persistence, or rate limiting implementation. Those belong to Phase 5.
- No PostgreSQL schema or durable long-term workspace history.
- No frontend switch to HTTP API yet. That belongs to Phase 6.
- No backend SVG/PNG rendering or export.
- No authentication system beyond accepting optional auth/session context shape and returning anonymous-session-compatible IDs.
- No full collaborative editor, billing, SSO, or project management integrations.

## Step-by-Step Tasks

### Task 1: Prepare branch, package-manager stance, and backend scaffold tests

- ACTION: Before implementation, create/switch to a feature branch such as `codex/nestjs-backend-validator` because `main` is dirty from PRP planning files.
- IMPLEMENT:
  - Leave untracked `pnpm-lock.yaml` untouched unless the user decides to adopt pnpm.
  - Use npm because `package-lock.json` is tracked.
  - Add failing expectations for backend scripts and route tests after scaffold exists.
- MIRROR: Existing root script style in `/Users/yeomjaeheon/Documents/dev/ai-user-flow/package.json:6`.
- IMPORTS: N/A.
- GOTCHA: Do not break existing frontend `npm run test:run`, `npm run typecheck`, or `npm run build`.
- VALIDATE: `git status --porcelain`

### Task 2: Scaffold standalone NestJS backend app under `apps/backend`

- ACTION: Create `/Users/yeomjaeheon/Documents/dev/ai-user-flow/apps/backend/`.
- IMPLEMENT:
  - Add backend `package.json`, `nest-cli.json`, `tsconfig.json`, `tsconfig.build.json`.
  - Add minimal `src/main.ts`, `src/app.module.ts`, `src/planning/planning.module.ts`.
  - Add root convenience scripts:
    - `backend:dev`
    - `backend:build`
    - `backend:test`
    - `backend:test:e2e`
    - `backend:typecheck`
  - Install backend dependencies with npm:
    - runtime: `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `reflect-metadata`, `rxjs`, `zod`, `mermaid`
    - dev: `@nestjs/cli`, `@nestjs/testing`, `@types/express`, `@types/jest`, `jest`, `supertest`, `ts-jest`, `ts-node`, `typescript`
- MIRROR: NestJS module/controller/provider structure from `nestjs-patterns` skill.
- IMPORTS: Backend can import shared frontend contract by relative path initially, or copy contract into backend DTOs with an explicit TODO to extract `packages/planning-contract` later.
- GOTCHA: Directly importing from `src/features/planning` may require `rootDir`/path config. Prefer a small backend-local DTO mirror if TypeScript project boundaries become brittle, but keep tests proving compatibility with the frontend schema.
- VALIDATE: `npm run backend:typecheck`

### Task 3: Add common API envelopes and error filter

- ACTION: Add backend common validation and error files.
- IMPLEMENT:
  - `createSuccessEnvelope(data)`.
  - `createFailureEnvelope({ code, message, retryable, details? })`.
  - `HttpExceptionFilter` that returns failure envelopes.
  - `getErrorMessage(error: unknown)` helper with no stack trace in API response.
  - Keep details sanitized and bounded.
- MIRROR: Frontend envelope schemas in `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningSchema.ts:268`.
- IMPORTS: Nest `ExceptionFilter`, `Catch`, `ArgumentsHost`, `HttpException`.
- GOTCHA: Do not return raw Zod issue payloads if they include large user text. Convert to path/message pairs.
- VALIDATE: `npm run backend:test`

### Task 4: Implement planning DTO parsing and normalization service

- ACTION: Add `PlanningService` and DTO parser.
- IMPLEMENT:
  - Accept `{ rawText, elements? }`.
  - Enforce strict nine-element keys.
  - Trim raw text and elements.
  - Drop empty optional element values.
  - Create deterministic anonymous `sessionId` for Phase 2, e.g. `session_<timestamp or crypto randomUUID>`.
  - Return `PlanningSessionSnapshot`-compatible object with `status: 'input_received'` or `needs_clarification`.
  - Compute non-AI completeness from raw text plus elements:
    - user signal: `targetUser` or persona/user keywords
    - problem signal: `problem` or problem keywords
    - action signal: `coreScenario` or action keywords
- MIRROR: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningContracts.ts:18`.
- IMPORTS: `zod`, Node `crypto.randomUUID`.
- GOTCHA: Keep this deterministic and non-AI. Do not call OpenAI or LangGraph.
- VALIDATE: `npm run backend:test -- planning.service`

### Task 5: Add `POST /api/planning-sessions`

- ACTION: Implement controller route.
- IMPLEMENT:
  - Parse body with Zod safe parser.
  - On success, return success envelope with:
    - `id`
    - `version`
    - `status`
    - normalized `input`
    - `analysis: null`
    - empty `dependencyAnalysis`
    - empty entity mapping
    - `stateMachine: null`
    - `validation`
    - `flowDraft: null`
    - `mermaidDocument: null`
  - On validation failure, return `400` with `VALIDATION_FAILED`.
  - Reject unknown element keys.
- MIRROR: Session snapshot schema in `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningSchema.ts:254`.
- IMPORTS: Nest `Controller`, `Post`, `Body`, `BadRequestException`.
- GOTCHA: Controller should not contain validation logic beyond calling service/provider.
- VALIDATE: `npm run backend:test:e2e -- planning`

### Task 6: Implement deterministic safety validator provider

- ACTION: Add `/Users/yeomjaeheon/Documents/dev/ai-user-flow/apps/backend/src/planning/planning.validator.ts`.
- IMPLEMENT:
  - `validatePlanningInput(input: unknown)`.
  - `validatePromptInjection(input)`.
  - `validateMermaidSafety(code)`.
  - `validateFlowDraftShape(draft)` for node IDs, section IDs, edge endpoints, and labels.
  - `validateGraphCycles(edges)` with allowlisted retry edges only.
  - Return `PlanningValidationReport`-compatible objects:
    - `jsonSchema`
    - `mermaidSyntax`
    - `cycleCheck`
    - `promptInjectionCheck`
    - `retryCount`
    - `errors`
  - Detect unsafe prompt phrases:
    - `ignore previous instructions`
    - `system prompt`
    - `developer message`
    - `이전 지시를 무시`
  - Detect unsafe Mermaid/code fragments:
    - `%%{init`
    - `<script`
    - raw event-handler attributes
    - `securityLevel`
    - `htmlLabels`
- MIRROR: PRD Mermaid generation rules at `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:321`.
- IMPORTS: Zod schemas/types from DTO file.
- GOTCHA: This is defense-in-depth, not a full prompt security classifier. Keep messages user-safe and concise.
- VALIDATE: `npm run backend:test -- planning.validator`

### Task 7: Implement parse-only Mermaid syntax service

- ACTION: Add `/Users/yeomjaeheon/Documents/dev/ai-user-flow/apps/backend/src/planning/mermaid-syntax.service.ts`.
- IMPLEMENT:
  - Initialize Mermaid once with:
    - `startOnLoad: false`
    - `securityLevel: 'strict'`
    - `flowchart.htmlLabels: false`
  - Expose `validateSyntax(code: string)`.
  - Call `mermaid.parse(code, { suppressErrors: false })`.
  - Return `mermaidSyntax: 'passed'` on valid code.
  - Return `mermaidSyntax: 'failed'` on thrown parser errors or `false`.
  - Do not call `mermaid.render()`.
- MIRROR: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/mermaidRenderer.ts:117`.
- IMPORTS: `mermaid`.
- GOTCHA: Mermaid ESM import may require dynamic import in Nest/Jest. If static import fails, isolate dynamic import behind the service and mock it in unit tests.
- VALIDATE: `npm run backend:test -- mermaid-syntax`

### Task 8: Add `POST /api/planning-sessions/:sessionId/mermaid/validate`

- ACTION: Implement controller route and service method.
- IMPLEMENT:
  - Request body: `{ code: string }`.
  - Run deterministic Mermaid safety checks first.
  - If safety fails, skip parser and return failure validation report.
  - If safety passes, run parse-only Mermaid validation.
  - Return success envelope containing a `MermaidDocument`-compatible validation result:
    - original code
    - `renderStatus: 'rendered'` is not allowed because no render happened
    - prefer `renderStatus: 'generated'` for syntax-passed or `fallback` for failed syntax
    - `svg: null`
    - `retryCount: 0`
    - `renderError` from sanitized parser error if failed
  - Include `validation` report.
- MIRROR: Endpoint suggestion at `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:342`.
- IMPORTS: Nest route decorators.
- GOTCHA: Keep parser validation separate from rendering terminology. Do not claim rendered preview.
- VALIDATE: `npm run backend:test:e2e -- mermaid`

### Task 9: Add placeholder route boundaries for later phases

- ACTION: Add explicit unsupported placeholders only if useful.
- IMPLEMENT:
  - Optional `POST /api/planning-sessions/:sessionId/analyze` returns `501 NOT_IMPLEMENTED` or omit until Phase 3.
  - Optional `POST /api/planning-sessions/:sessionId/state-machine` returns `501 NOT_IMPLEMENTED` or omit until Phase 4.
  - Document chosen behavior in report.
- MIRROR: Endpoint list in `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:333`.
- IMPORTS: Nest `NotImplementedException` if placeholders are added.
- GOTCHA: Prefer omitting endpoints over fake implementations if tests would imply feature readiness.
- VALIDATE: `npm run backend:test:e2e`

### Task 10: Validate root frontend is unaffected

- ACTION: Run existing frontend validation.
- IMPLEMENT:
  - Confirm current root commands still pass.
  - Confirm adding `apps/backend` does not alter frontend build output.
- MIRROR: Existing root scripts in `/Users/yeomjaeheon/Documents/dev/ai-user-flow/package.json:6`.
- IMPORTS: N/A.
- GOTCHA: Do not move existing frontend files during Phase 2.
- VALIDATE:
  - `npm run test:run`
  - `npm run typecheck`
  - `npm run build`

### Task 11: Write report, update PRD, and archive plan

- ACTION: Complete PRP implementation bookkeeping.
- IMPLEMENT:
  - Write `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/reports/backend-orchestration-deterministic-validator-report.md`.
  - Include tasks completed, endpoints created, validation results, files changed, deviations, risks, and follow-up phase recommendation.
  - Mark PRD Phase 2 `complete` and link the report.
  - Move plan to `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/plans/completed/backend-orchestration-deterministic-validator.plan.md`.
  - Run `graphify update .` because backend code files were added.
- MIRROR: Existing report pattern in `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/reports/backend-orchestration-contract-alignment-report.md`.
- IMPORTS: N/A.
- GOTCHA: Only mark complete after backend tests, root tests, typecheck, build, and graphify update are done or explicitly documented as blocked.
- VALIDATE:
  - `npm run backend:test`
  - `npm run backend:test:e2e`
  - `npm run backend:typecheck`
  - `npm run backend:build`
  - `npm run test:run`
  - `npm run typecheck`
  - `npm run build`
  - `graphify update .`

## Testing Strategy

- Backend unit tests:
  - Planning normalization and completeness provider.
  - Zod validation helpers and failure envelopes.
  - Prompt injection and Mermaid safety heuristics.
  - Mermaid syntax service with mocked parser for pass/fail/throw cases.
- Backend request tests:
  - `GET /health` returns success.
  - `POST /api/planning-sessions` accepts raw text only.
  - `POST /api/planning-sessions` accepts all nine elements.
  - Unknown planning element key returns `400 VALIDATION_FAILED`.
  - Prompt-injection text returns failed `promptInjectionCheck`.
  - `POST /api/planning-sessions/:sessionId/mermaid/validate` accepts valid Mermaid.
  - Unsafe Mermaid directives are blocked before parser invocation.
- Frontend regression:
  - Existing Vitest suite remains passing.
  - Existing TypeScript build remains passing.
- Build validation:
  - Backend compiles independently.
  - Root frontend build remains unaffected.

## Validation Commands

Run during implementation:

```bash
npm run backend:test
npm run backend:test:e2e
npm run backend:typecheck
npm run backend:build
npm run test:run
npm run typecheck
npm run build
graphify update .
```

If backend package scripts are not yet wired, use:

```bash
npm --prefix apps/backend run test
npm --prefix apps/backend run test:e2e
npm --prefix apps/backend run typecheck
npm --prefix apps/backend run build
```

## Acceptance Criteria

- A standalone NestJS backend app exists under `apps/backend`.
- Root scripts expose backend test, typecheck, build, and dev commands without breaking existing frontend scripts.
- `GET /health` works.
- `POST /api/planning-sessions` accepts raw text plus optional nine planning elements and returns a frontend-compatible session snapshot envelope.
- Unknown planning element keys and invalid payloads return `400` failure envelopes with stable machine-readable error codes.
- Backend deterministic validation returns `PlanningValidationReport`-compatible objects.
- Prompt override attempts and unsafe Mermaid directives/raw HTML/config overrides are detected before parser/render work.
- `POST /api/planning-sessions/:sessionId/mermaid/validate` performs parse-only Mermaid validation and never claims SVG rendering.
- No AI, Redis, persistence, auth, or frontend API switching is implemented in Phase 2.
- Backend unit/e2e tests and root frontend validation pass, or any blocker is documented in the report.
- PRD Phase 2 is marked complete only after report and validation evidence exist.

## Risks and Notes

- Importing frontend Zod schemas directly from a Vite `src/` tree can create brittle TypeScript boundaries. If this becomes painful, mirror a minimal backend DTO in `apps/backend/src/planning/dto/planning.dto.ts` and add compatibility tests against the frontend schema. A later cleanup can extract a shared `packages/planning-contract`.
- Mermaid is ESM-heavy and may behave differently in Jest/Nest. Keep syntax parsing behind `MermaidSyntaxService` so it can be mocked in unit tests and exercised in one e2e/integration test.
- This phase introduces backend dependencies and lockfile churn. Use npm because `package-lock.json` is tracked; leave untracked `pnpm-lock.yaml` alone unless package-manager migration is explicitly requested.
- Phase 2 validates and normalizes but does not yet perform AI extraction or real Mermaid generation. That means `/analyze`, `/state-machine`, and `/mermaid` generation routes should be omitted or clearly marked not implemented until Phases 3 and 4.
- Security behavior should be strict at request boundaries but user-safe in responses. Do not echo full user payloads or parser internals in error responses.
