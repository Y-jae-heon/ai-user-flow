# Backend Orchestration Phase 2 Report: NestJS Backend Scaffold and Deterministic Validator

## Summary

Implemented Phase 2 as a standalone NestJS backend app under `apps/backend`. The backend now exposes health, planning-session creation, and Mermaid validation endpoints with API envelopes aligned to the frontend contract. It performs deterministic Zod validation, input normalization, completeness scoring, prompt-injection signal detection, Mermaid safety checks, and parse-only Mermaid syntax validation.

## Tasks Completed

- Created feature branch `codex/nestjs-backend-validator`.
- Added npm workspace support for `apps/backend`.
- Added root backend scripts:
  - `backend:dev`
  - `backend:build`
  - `backend:test`
  - `backend:test:e2e`
  - `backend:typecheck`
- Added standalone NestJS app scaffold.
- Added common API success/failure envelope helpers.
- Added global HTTP exception filter returning stable failure envelopes.
- Added backend-local Zod planning DTOs compatible with frontend `planningSchema.ts`.
- Added planning service for request normalization, non-AI completeness scoring, and session snapshot creation.
- Added deterministic planning validator for schema, prompt, Mermaid safety, flow draft shape, and cycle checks.
- Added parse-only Mermaid syntax service.
- Addressed review findings:
  - unexpected non-HTTP exceptions now return a generic user-safe message
  - Mermaid parser runtime incompatibility now returns a failed validation report instead of marking regex-only fallback checks as passed
- Added endpoints:
  - `GET /health`
  - `POST /api/planning-sessions`
  - `POST /api/planning-sessions/:sessionId/mermaid/validate`
- Added backend unit and e2e tests.
- Updated root Vitest config to exclude backend Jest specs.
- Ran `graphify update .`.

## Files Changed

- `package.json`
- `package-lock.json`
- `vite.config.ts`
- `apps/backend/**`
- `.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md`
- `.codex/PRPs/reports/backend-orchestration-deterministic-validator-report.md`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/graph.json`
- `graphify-out/graph.html`

## Validation Results

| Command | Result |
|---|---|
| `npm install` | Passed, 0 vulnerabilities |
| `npm run backend:typecheck` | Passed |
| `npm run backend:test -- http-exception.filter mermaid-syntax.service` | RED confirmed before production fixes; failed for the reviewed leak and parser-bypass behaviors |
| `npm run backend:test -- http-exception.filter mermaid-syntax.service` | Passed after fixes, 2 suites / 6 tests |
| `npm run backend:test` | Passed, 5 suites / 16 tests |
| `npm run backend:test:e2e` | Passed, 1 suite / 6 tests |
| `npm run backend:build` | Passed |
| `npm run test:run` | Passed, 7 files / 67 tests |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `graphify update .` | Passed |

## Deviations

- The backend mirrors the current frontend planning Zod DTOs locally instead of importing production DTOs directly from `src/features/planning`. This avoids brittle TypeScript app boundaries. A compatibility unit test compares backend planning input parsing with the frontend schema.
- Mermaid parse-only validation uses the official Mermaid parser when the runtime supports it. Jest/Node can surface Mermaid 11 DOMPurify adapter compatibility errors; those runtime parser-availability failures now return a failed syntax validation report instead of treating conservative regex shape checks as parser success. Unsafe directives and raw markup are still blocked before parser work.
- Placeholder routes for later phases were omitted instead of returning `501`. This avoids making `/analyze`, `/state-machine`, or full `/mermaid` generation appear available before Phases 3 and 4.

## Tests Added

- Backend DTO compatibility tests.
- Planning validator unit tests for:
  - valid schema reports
  - unknown element rejection
  - prompt override detection
  - unsafe Mermaid directive detection
  - allowed retry cycles
  - unsafe cycles
- Mermaid syntax service unit tests.
- Global HTTP exception filter unit tests for stable envelopes and generic unexpected-error responses.
- Planning service unit tests.
- Planning API e2e tests for:
  - health check
  - session creation
  - strict element validation
  - prompt-injection validation status
  - safe Mermaid syntax validation
  - unsafe Mermaid directive blocking

## Security Notes

- Request bodies are treated as untrusted and parsed through Zod.
- Unknown planning element keys are rejected.
- API errors use stable machine-readable codes and avoid stack trace leakage.
- Prompt override signals are flagged in validation reports.
- Mermaid init/config directives, raw HTML/script tags, event handlers, `securityLevel`, and `htmlLabels` are blocked before parser invocation.
- No secrets, AI provider keys, Redis credentials, auth tokens, or persistence credentials were added.

## Remaining Work

- Phase 3: Add AI extraction workflow behind the NestJS planning module.
- Phase 4: Add state-machine and Mermaid generation endpoints.
- Phase 5: Add Redis/session persistence, idempotency, retry counters, audit logs, and rate limiting.
- Phase 6: Switch the frontend from local analysis/generation to backend API calls.
