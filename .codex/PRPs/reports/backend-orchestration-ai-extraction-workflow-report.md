# Backend Orchestration AI Extraction Workflow Report

## Summary

Implemented Phase 3 of `backend-orchestration-mermaid-generation.prd.md`: the backend now has a bounded OpenAI ChatGPT extraction path, strict extraction DTOs, a LangGraph workflow wrapper, deterministic fallback extraction, and an analyze endpoint that returns a frontend-compatible `PlanningSessionSnapshot`.

## Tasks Completed

- Tightened backend planning DTOs for assumptions, suggestions, contradictions, dependency analysis, and entity mappings.
- Added OpenAI configuration parsing for API key, model, timeout, and max attempts.
- Added `openai` and `@langchain/langgraph` backend dependencies.
- Added a mockable `PlanningAiClient` provider backed by OpenAI Responses API Structured Outputs.
- Added a bounded LangGraph `PlanningWorkflow` with explicit recursion limit.
- Added `PlanningExtractionService` with prompt-injection gating, schema validation, deterministic fallback, and immutable snapshot creation.
- Added `POST /api/planning-sessions/:sessionId/analyze`.
- Added unit and E2E coverage for DTO compatibility, config parsing, AI client availability, extraction success, prompt-injection skip, deterministic fallback, blocking contradiction handling, and API behavior.
- Ran `graphify update .` after code changes.
- Moved the executed plan to `.codex/PRPs/plans/completed/backend-orchestration-ai-extraction-workflow.plan.md`.

## Files Changed

- `.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md`
- `.codex/PRPs/reports/backend-orchestration-ai-extraction-workflow-report.md`
- `apps/backend/package.json`
- `package-lock.json`
- `apps/backend/src/config/app.config.ts`
- `apps/backend/src/config/app.config.spec.ts`
- `apps/backend/src/planning/dto/planning.dto.ts`
- `apps/backend/src/planning/dto/planning.dto.spec.ts`
- `apps/backend/src/planning/planning.ai-client.ts`
- `apps/backend/src/planning/planning.ai-client.spec.ts`
- `apps/backend/src/planning/planning.controller.ts`
- `apps/backend/src/planning/planning.extraction.service.ts`
- `apps/backend/src/planning/planning.extraction.service.spec.ts`
- `apps/backend/src/planning/planning.module.ts`
- `apps/backend/src/planning/planning.service.ts`
- `apps/backend/src/planning/planning.workflow.ts`
- `apps/backend/test/planning.e2e-spec.ts`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/graph.html`
- `graphify-out/graph.json`

## Validation Results

Passed:

```bash
npm --workspace @ai-user-flow/backend run typecheck
npm --workspace @ai-user-flow/backend run test
npm --workspace @ai-user-flow/backend run test:e2e
npm --workspace @ai-user-flow/backend run build
graphify update .
```

Failed with residual dependency advisory:

```bash
npm audit --workspace @ai-user-flow/backend --omit=dev
```

Audit result: 4 moderate `uuid <14.0.0` advisories through nested `@langchain/langgraph`, `@langchain/langgraph-checkpoint`, and `@langchain/langgraph-sdk` dependencies. `npm audit fix --force` suggested a breaking downgrade to `@langchain/langgraph@0.0.12`, so no automatic fix was applied.

## Audit Risk Acceptance

Accepted temporarily for Phase 3:

- Advisory: `uuid <14.0.0` missing buffer bounds check when caller supplies a mutable buffer.
- Source: transitive runtime dependencies of `@langchain/langgraph@1.2.9`.
- Scope in this implementation: the backend uses LangGraph only as an in-process bounded workflow wrapper and does not pass user-controlled buffers to `uuid`.
- Decision: do not run `npm audit fix --force` because it downgrades LangGraph to `0.0.12`, which is a breaking dependency change and would invalidate the implemented API surface.
- CI policy note: if CI gates on `npm audit --omit=dev`, add a scoped temporary exception for this advisory/package chain and remove it when LangGraph publishes a non-breaking dependency update that resolves the nested `uuid` versions.
- Follow-up owner: Phase 4 or dependency-maintenance pass should re-run `npm audit --workspace @ai-user-flow/backend --omit=dev` and upgrade LangGraph when a safe fixed version is available.

## Deviations

- The analyze endpoint accepts either a supplied session snapshot or raw input and uses the route `sessionId` for input-only requests. This keeps Phase 3 usable before Phase 5 adds Redis-backed session lookup.
- The LangGraph workflow is intentionally a bounded single-extraction pipeline with deterministic fallback rather than a multi-loop correction graph. Bounded self-correction belongs to later Mermaid generation phases.
- The OpenAI API key is validated at extraction time rather than process startup so local tests and non-AI endpoints do not require secrets.

## Known Limitations

- No Redis persistence, idempotency, audit logging, or rate limiting yet; Phase 5 owns those capabilities.
- No frontend integration yet; Phase 6 owns replacing local frontend analysis calls.
- OpenAI extraction is covered through the mockable client boundary and schema validation, not a live API call.
- The backend and frontend still duplicate schema contracts; a shared package can reduce drift in a later refactor.

## Next Step

Proceed to Phase 4: state-machine and Mermaid generation.
