# Backend Orchestration Persistence and Resilience Plan

## Summary

Implement Phase 5 of the backend orchestration PRD: add Redis-backed session persistence, idempotent generation requests, durable retry counters, bounded audit logging, and rate limiting around the existing NestJS planning orchestration.

User story: as a product planner, I can create and analyze a planning session, refresh or retry the flow, and receive consistent backend responses without losing session state, accidentally double-running expensive AI/Mermaid generation, or exceeding safe request limits.

## Metadata

- Complexity: High
- Source PRD: `.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md`
- PRD phase: `5. Persistence and resilience`
- Plan artifact: `.codex/PRPs/plans/backend-orchestration-persistence-resilience.plan.md`
- Estimated files: 14-20 files
- Primary runtime: NestJS TypeScript backend
- Current baseline: Phase 1-4 backend code exists; session snapshots are request/response payloads only and are not persisted.

## UX Design

N/A for visible layout. API behavior changes only:

- Before: `POST /api/planning-sessions/:sessionId/analyze` and `/mermaid` require the client to send either input or a full snapshot, and nothing survives outside the request.
- After Phase 5: `POST /api/planning-sessions` stores the created snapshot with a Redis TTL, `GET /api/planning-sessions/:sessionId` returns the latest snapshot, analyze/generate endpoints can load the stored session when the body omits `session`, and repeated idempotent requests return the original response.
- Error responses keep the existing envelope shape and user-safe messages.

## Mandatory Reading

- `.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:91` - Phase 5 Should Have requirements: idempotency keys, Redis cache, retry counters, and audit trail.
- `.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:333` - endpoint table includes `GET /api/planning-sessions/{sessionId}` and idempotency on analyze.
- `.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:346` - technical approach recommends Redis for session cache, idempotency keys, and retry counters.
- `.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:380` - security rules require Redis TTLs, rate limiting by user/session/IP, and safe audit traces.
- `graphify-out/GRAPH_REPORT.md:22` - current backend hubs include `PlanningService`, `PlanningValidator`, `MermaidSyntaxService`, and snapshot creation helpers.
- `apps/backend/src/planning/planning.controller.ts:4` - existing planning API surface has create, analyze, Mermaid validate, and Mermaid generate routes.
- `apps/backend/src/planning/planning.service.ts:44` - session creation normalizes, validates, scores completeness, and currently returns a snapshot without storing it.
- `apps/backend/src/planning/planning.service.ts:61` - analyze accepts a supplied session or creates one from input; this is the main point to load persisted sessions.
- `apps/backend/src/planning/planning.service.ts:99` - Mermaid generation currently requires a full session in the body and returns a new snapshot.
- `apps/backend/src/planning/dto/planning.dto.ts:259` - `PlanningSessionSnapshot` is the persistence contract to store and retrieve.
- `apps/backend/src/planning/dto/planning.dto.ts:290` - analysis request schema currently accepts only `session` or `input`; Phase 5 may add optional idempotency metadata or use headers instead.
- `apps/backend/src/common/api-envelope.ts:20` - successful responses must remain `createSuccessEnvelope(data)`.
- `apps/backend/src/common/filters/http-exception.filter.ts:17` - errors are normalized centrally; new resilience errors should use `HttpException` subclasses/bodies compatible with this filter.
- `apps/backend/src/config/app.config.ts:1` - environment configuration currently covers port, CORS, and OpenAI settings; add Redis/rate-limit settings here.
- `apps/backend/src/main.ts:11` - CORS/global filter bootstrap is the place to keep app-wide HTTP behavior explicit.
- `apps/backend/test/planning.e2e-spec.ts:121` - existing e2e tests cover the current create/analyze/generate flow and should be extended rather than replaced.

## External Documentation Findings

- NestJS caching docs recommend `@nestjs/cache-manager` plus `cache-manager`; current Redis examples use Keyv stores, including `KeyvRedis`, rather than older `cache-manager-redis-store` patterns. Source: [NestJS Caching](https://docs.nestjs.com/techniques/caching).
- NestJS rate limiting is provided by `@nestjs/throttler`; `ThrottlerModule.forRoot` accepts named throttler entries with `ttl`, `limit`, `blockDuration`, and custom storage options. Source: [NestJS Rate Limiting](https://docs.nestjs.com/security/rate-limiting).
- `ioredis` supports atomic `SET key value EX seconds NX`, which is suitable for idempotency claim locks and duplicate-request protection. Source: [ioredis README](https://github.com/redis/ioredis).
- Local package registry checks on 2026-04-30 returned: `@nestjs/throttler@6.5.0`, `ioredis@5.10.1`, `ioredis-mock@8.13.1`, `@nestjs/cache-manager@3.1.2`, `keyv@5.6.0`, and `@keyv/redis@5.1.6`.
- Implementation recommendation: use a small explicit `PlanningSessionStore` abstraction over `ioredis` for session/idempotency/audit semantics instead of relying on generic Nest cache APIs for write-once idempotency and list audit records.

## Patterns To Mirror

### Existing API envelope

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

All new read/idempotency responses should return the same envelope. Do not introduce a second response format for cached responses.

### Immutable snapshot updates

Source: `apps/backend/src/planning/planning.service.ts:118`

```ts
return createSuccessEnvelope(
  planningSessionSnapshotSchema.parse({
    ...snapshot,
    status: nextStatus,
    stateMachine,
    flowDraft: generation.flowDraft,
    mermaidDocument: generation.mermaidDocument,
    validation: generation.validation
  })
)
```

Persist only validated, newly-created snapshots. Do not mutate snapshots in place before validation.

### Validation before orchestration

Source: `apps/backend/src/planning/planning.service.ts:104`

```ts
const parsedRequest = safeParseWithMessages(mermaidGenerationRequestSchema, request)
if (!parsedRequest.ok) {
  throwValidationError(parsedRequest.errors)
}
```

Every persisted read/write boundary should parse through Zod before storage and after retrieval. Redis values are external data once read back.

### Safety-before-parser ordering

Source: `apps/backend/src/planning/planning.service.ts:85`

```ts
const safetyReport = this.planningValidator.validateMermaidSafety(parsedRequest.value.code)
const syntaxReport =
  safetyReport.mermaidSyntax === 'failed'
    ? createPassedReport({ mermaidSyntax: 'skipped' })
    : await this.mermaidSyntaxService.validateSyntax(parsedRequest.value.code)
```

Audit records should capture the safe validation result, not raw unsafe Mermaid or prompt text. Keep secret/user-text redaction before storing traces.

### Test doubles through providers

Source: `apps/backend/test/planning.e2e-spec.ts:87`

```ts
const moduleRef = await Test.createTestingModule({
  imports: [AppModule]
})
  .overrideProvider(MERMAID_PARSER_ADAPTER)
  .useValue(mermaidParserAdapter)
  .overrideProvider(PLANNING_AI_CLIENT)
  .useValue(planningAiClient)
  .compile()
```

Register Redis/session store/rate-limit dependencies as Nest providers so unit and e2e tests can override them with in-memory fakes.

## Files To Change

- `apps/backend/package.json` - add Redis/rate-limit dependencies, likely `ioredis`, `@nestjs/throttler`, and test-only `ioredis-mock` if integration tests use a Redis-compatible fake.
- `package-lock.json` and/or `pnpm-lock.yaml` - update through the project package manager command used for dependency installation.
- `apps/backend/src/config/app.config.ts` and `apps/backend/src/config/app.config.spec.ts` - add Redis URL, TTLs, idempotency TTL, audit TTL, rate-limit windows, and validation.
- `apps/backend/src/app.module.ts` - import or register rate-limit module/providers globally when appropriate.
- `apps/backend/src/main.ts` - no direct rate-limit logic unless global guard binding requires app-level setup; prefer module/provider registration.
- `apps/backend/src/planning/planning.module.ts` - register session store, audit logger, idempotency service, retry counter service, and provider tokens.
- `apps/backend/src/planning/planning.controller.ts` - add `GET /api/planning-sessions/:sessionId`; read idempotency keys from headers for create/analyze/generate/validate if implemented at controller level.
- `apps/backend/src/planning/planning.service.ts` - persist created/analyzed/generated snapshots, load persisted snapshots, wrap expensive operations in idempotency, increment retry counters, and write audit events.
- `apps/backend/src/planning/dto/planning.dto.ts` - add strict schemas/types for persisted audit events, idempotency records, store payloads, and possibly persisted session metadata.
- `apps/backend/src/planning/planning.session-store.ts` - new Redis-backed store abstraction for `getSession`, `saveSession`, `deleteSession`, and TTL handling.
- `apps/backend/src/planning/planning.idempotency.service.ts` - new service for idempotency-key validation, atomic claim, response replay, and failed-claim cleanup.
- `apps/backend/src/planning/planning.audit.service.ts` - new redacted audit event writer/reader for prompt/model/validation/generation events.
- `apps/backend/src/planning/planning.retry-counter.service.ts` - new service for per-session/per-operation retry counters with TTL and max limits.
- `apps/backend/src/planning/planning.rate-limit.guard.ts` or module config - only if built-in `@nestjs/throttler` guard needs custom tracker keys by session/IP.
- `apps/backend/src/planning/*.spec.ts` - unit tests for config, store, idempotency, audit redaction, retry counters, and service orchestration.
- `apps/backend/test/planning.e2e-spec.ts` - e2e coverage for persisted session fetch, body-less analyze/generate from stored snapshots, idempotent replay, and throttling.
- `.codex/PRPs/reports/backend-orchestration-persistence-resilience-report.md` - implementation report after Phase 5 is complete.

## NOT Building

- Frontend migration to backend-backed calls; Phase 6 owns this.
- PostgreSQL or long-term historical session storage.
- User accounts, SSO, enterprise workspaces, billing, or role-based authorization.
- BullMQ/background job orchestration unless a test proves synchronous orchestration cannot meet reliability requirements.
- RAG/template retrieval or domain template packs.
- Server-rendered SVG/PNG export.
- A generic distributed lock framework beyond idempotency and bounded retry counters needed by this backend.

## Step-By-Step Tasks

### Task 1 - Add Resilience Configuration and Dependencies

- ACTION: Add validated backend configuration for Redis, idempotency, sessions, audit logs, retry limits, and rate limiting.
- IMPLEMENT: Extend `AppConfig` with `redisUrl`, `planningSessionTtlSeconds`, `planningIdempotencyTtlSeconds`, `planningAuditTtlSeconds`, `planningMaxGenerationRetries`, `rateLimitTtlMs`, and `rateLimitMaxRequests`. Add dependency entries for `ioredis` and `@nestjs/throttler`; add `ioredis-mock` only if used in tests.
- MIRROR: Existing parser helpers in `apps/backend/src/config/app.config.ts:21` and `apps/backend/src/config/app.config.ts:34`.
- IMPORTS: `@nestjs/throttler`, `ioredis`, existing config helpers.
- GOTCHA: Keep Redis optional for local test/dev by supporting an in-memory provider fallback only when `REDIS_URL` is absent; do not silently disable persistence in production mode if a production env flag exists later.
- VALIDATE: Add config tests for defaults, invalid URLs/integers, TTL lower bounds, and rate-limit values.

### Task 2 - Introduce Store DTOs and Provider Tokens

- ACTION: Define strict persistence contracts before writing Redis code.
- IMPLEMENT: Add schemas for `PlanningAuditEvent`, `PlanningIdempotencyRecord`, and `StoredPlanningSession` that wrap `planningSessionSnapshotSchema`. Add provider tokens such as `PLANNING_SESSION_STORE`, `PLANNING_IDEMPOTENCY_STORE`, and `PLANNING_AUDIT_STORE` if separate abstractions are useful.
- MIRROR: Existing strict schema style in `apps/backend/src/planning/dto/planning.dto.ts:273`.
- IMPORTS: `z`, `planningSessionSnapshotSchema`, `planningValidationReportSchema`.
- GOTCHA: Do not store raw `unknown`; parse before writing and parse after reading. Include schema version fields so future Phase 6/frontend changes can detect stale records.
- VALIDATE: DTO tests reject unknown keys, invalid session snapshots, unsafe audit event types, and oversized redacted text fields.

### Task 3 - Build Planning Session Store

- ACTION: Implement a Redis-backed `PlanningSessionStore` with an in-memory test implementation.
- IMPLEMENT: Methods should include `saveSession(snapshot)`, `getSession(sessionId)`, `requireSession(sessionId)`, and optionally `deleteSession(sessionId)`. Use keys like `planning:session:${sessionId}` and set TTL every time a new validated snapshot is saved.
- MIRROR: Snapshot validation in `apps/backend/src/planning/planning.service.ts:119`.
- IMPORTS: `Redis` from `ioredis`, `planningSessionSnapshotSchema`, `NotFoundException` or `BadRequestException`.
- GOTCHA: Redis reads can return stale or corrupted JSON. Treat parse failure as a store integrity error with a user-safe message and write an audit event if possible.
- VALIDATE: Unit tests save/read parsed snapshots, refresh TTL on update, return not found for missing sessions, and reject corrupted stored JSON.

### Task 4 - Persist Session Lifecycle in PlanningService

- ACTION: Save and load planning snapshots in the existing orchestration service.
- IMPLEMENT: `createPlanningSession()` saves the created snapshot. `analyzePlanningSession()` loads the stored snapshot when body omits `session`/`input`, saves the analyzed snapshot, and still accepts explicit body input for backward compatibility. `generateMermaid()` loads the stored snapshot when body omits `session`, saves the generated/blocked snapshot, and keeps route/body ID mismatch validation. `validateMermaid()` may remain stateless but should audit by session ID.
- MIRROR: Current create/analyze/generate methods at `apps/backend/src/planning/planning.service.ts:44`, `apps/backend/src/planning/planning.service.ts:61`, and `apps/backend/src/planning/planning.service.ts:99`.
- IMPORTS: New store interface, existing schemas, `createSuccessEnvelope`.
- GOTCHA: Keep compatibility with existing e2e tests that send full snapshots. Body-less session loading is additive, not a breaking replacement.
- VALIDATE: Service tests cover create-save, get-load, analyze-load-save, generate-load-save, missing session, and mismatched explicit session IDs.

### Task 5 - Add GET Session Endpoint

- ACTION: Add `GET /api/planning-sessions/:sessionId` for frontend hydration and retry flows.
- IMPLEMENT: Add controller method delegating to `planningService.getPlanningSession(sessionId)`, returning `createSuccessEnvelope(snapshot)`.
- MIRROR: Controller route style in `apps/backend/src/planning/planning.controller.ts:8`.
- IMPORTS: `Get`, `Param`, existing `PlanningService`.
- GOTCHA: Use the central exception filter for missing sessions; do not return `success: true` with null data.
- VALIDATE: E2E test creates a session, fetches it by ID, and verifies the response envelope and persisted normalized input.

### Task 6 - Implement Idempotency for Expensive Operations

- ACTION: Add idempotent replay for create/analyze/generate/validate requests where clients provide an idempotency key.
- IMPLEMENT: Accept `Idempotency-Key` header, normalize it with route/session scope, atomically claim it in Redis using `SET key value EX ttl NX`, store the final success or failure envelope body, and replay the stored response for duplicate keys with matching request hash. Reject duplicate keys with different request hashes.
- MIRROR: Existing request validation before execution in `apps/backend/src/planning/planning.service.ts:66`.
- IMPORTS: `crypto` for SHA-256 request hashes, Redis store abstraction, existing response envelope types.
- GOTCHA: Do not cache responses for malformed request bodies before validation unless the idempotency record explicitly stores validation failures. Avoid storing raw request text; store a hash and redacted route metadata.
- VALIDATE: Unit tests cover first claim, replay same request, reject same key/different hash, cleanup on thrown errors, and TTL expiry behavior. E2E should prove AI extraction is called once for duplicate analyze requests.

### Task 7 - Add Retry Counters and Operation Limits

- ACTION: Persist retry counters for generation and Mermaid validation attempts by session.
- IMPLEMENT: Track counters such as `planning:retry:${sessionId}:generate_mermaid` and `planning:retry:${sessionId}:validate_mermaid` with TTL. Increment before or after operation according to tests; block with a user-safe `BadRequestException` or `TooManyRequestsException` when configured max attempts are exceeded.
- MIRROR: Current in-response retry count behavior in `apps/backend/src/planning/planning.mermaid-generator.service.ts:98`.
- IMPORTS: Redis store, config max retry settings, existing validation report types.
- GOTCHA: Retry counters complement but do not replace `@nestjs/throttler`; counters enforce workflow-specific limits, while throttling enforces request-rate limits.
- VALIDATE: Tests prove counters increment, reset by TTL/session expiry, block after limit, and do not increment for request schema validation failures if that policy is chosen.

### Task 8 - Add Redacted Audit Trail

- ACTION: Record bounded audit events for planning lifecycle, AI extraction, validation failures, idempotency replay, and Mermaid generation.
- IMPLEMENT: Write events to Redis lists or sorted sets under `planning:audit:${sessionId}` with TTL. Event fields should include `eventId`, `sessionId`, `type`, `createdAt`, `status`, `modelMetadata` when available, validation statuses, retry counts, and redacted summaries. Add a private service method or test-only reader if needed; no public audit endpoint in Phase 5 unless required for tests.
- MIRROR: AI extraction metadata already returned in `apps/backend/src/planning/planning.extraction.service.ts:207`.
- IMPORTS: `randomUUID`, Redis store, DTO audit schema.
- GOTCHA: Never store API keys, raw prompts, full raw planning text, or unsafe Mermaid code. Store bounded excerpts only after redaction and length limits.
- VALIDATE: Unit tests verify event schema, TTL, event ordering, redaction of prompt-injection text, and absence of secrets such as `OPENAI_API_KEY` values.

### Task 9 - Add Rate Limiting

- ACTION: Apply request rate limiting to all planning endpoints, with stricter limits for AI extraction and Mermaid generation.
- IMPLEMENT: Register `ThrottlerModule.forRoot` using config values. Bind `ThrottlerGuard` globally or at planning controller/module level. If needed, implement a custom tracker that prefers session ID plus IP for session routes and IP for create routes.
- MIRROR: Existing route grouping under `apps/backend/src/planning/planning.controller.ts:4`.
- IMPORTS: `@nestjs/throttler`, `APP_GUARD` from `@nestjs/core` if using a global guard.
- GOTCHA: Tests must account for throttler state isolation. Use low limits only in dedicated tests or override config/provider to avoid flaking existing e2e coverage.
- VALIDATE: E2E test proves exceeding a configured low limit returns a failure envelope with a 429 status, while normal create/analyze/generate flows still pass.

### Task 10 - Full Validation, Report, and Graph Update

- ACTION: Run the full backend validation suite, update graphify after code changes, and write the Phase 5 implementation report.
- IMPLEMENT: Fix type/lint/test failures incrementally. Add `.codex/PRPs/reports/backend-orchestration-persistence-resilience-report.md` with tasks completed, files changed, validation results, deviations, and residual risks. Run `graphify update .` after code changes.
- MIRROR: Previous report format at `.codex/PRPs/reports/backend-orchestration-state-machine-mermaid-generation-report.md`.
- IMPORTS: N/A.
- GOTCHA: `pnpm-lock.yaml` is currently untracked in the worktree; do not remove or overwrite unrelated user changes.
- VALIDATE: See commands below.

## Testing Strategy

- Unit tests: config parsing, DTO schemas, Redis/in-memory session store, idempotency state transitions, retry counter behavior, audit redaction, service persistence behavior, and rate-limit tracker behavior if custom.
- Integration tests: planning service with in-memory store and mocked AI/Mermaid dependencies for create -> analyze -> generate -> fetch lifecycle.
- E2E tests: persisted session fetch, body-less analyze/generate, idempotent duplicate analyze/generate, missing session errors, throttled planning endpoint, and existing safety/validation paths.
- Regression tests: existing DTO compatibility, validator, extraction, state-machine, Mermaid generator, and API tests must keep passing.

## Validation Commands

```bash
npm install --workspace @ai-user-flow/backend ioredis @nestjs/throttler
npm install --workspace @ai-user-flow/backend --save-dev ioredis-mock
npm run backend:typecheck
npm run backend:test
npm run backend:test:e2e
npm run backend:build
npm run typecheck
npm run test:run
graphify update .
```

If the project standardizes on npm workspaces only, keep npm as the lockfile source of truth. If the team decides to keep `pnpm-lock.yaml`, regenerate it intentionally and document the choice in the implementation report.

## Acceptance Criteria

- `POST /api/planning-sessions` persists a validated snapshot with a configured TTL.
- `GET /api/planning-sessions/:sessionId` returns the latest persisted snapshot or a user-safe not-found error envelope.
- Analyze and Mermaid generation endpoints can operate from persisted session state without requiring the client to resend a full snapshot.
- Valid idempotency keys replay identical responses for duplicate create/analyze/generate requests and prevent duplicate AI/model generation work.
- Same idempotency key with a different request hash is rejected.
- Retry counters enforce configured workflow attempt limits for generation/validation.
- Audit events are written with bounded, redacted metadata and no secrets or full raw prompts.
- Planning endpoints are rate limited and return existing failure envelope shape on 429 responses.
- Existing frontend-compatible response schemas remain valid.
- All validation commands pass, and graphify is updated after code changes.

## Risks and Notes

- Redis outage behavior is a product decision. Recommended MVP behavior: fail closed for persisted/idempotent operations when Redis is configured but unavailable; allow explicit in-memory fallback only for local/test environments.
- The current backend returns `201` for several POST endpoints. Do not change status codes in Phase 5 unless tests and frontend integration are updated together.
- Idempotency can accidentally cache unsafe or overly detailed errors. Store user-safe envelope bodies only and keep raw exception details out of Redis.
- Rate limiting with in-memory throttler storage is not horizontally scalable. If deployment uses multiple instances, add Redis-backed throttler storage or document the limitation in the implementation report.
- Audit logs in Redis are short-lived resilience/debugging traces, not a compliance-grade audit database.
