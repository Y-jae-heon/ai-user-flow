# Backend Orchestration Frontend Integration Report

## Summary

Implemented Phase 6 of the backend orchestration PRD. The React planning workspace now creates/analyzes planning sessions through the NestJS API, sends reviewed suggestion status back during Mermaid generation, and continues to render backend-validated Mermaid code in the browser for SVG/PNG export.

## Tasks Completed

- Added a typed frontend planning API client with Zod response validation, idempotency headers, network/API error normalization, and optional abort signal support.
- Aligned the frontend Mermaid generation response schema with the backend's full `PlanningSessionSnapshot` response.
- Rewired `PlanningWorkspace` away from runtime local analysis and initial Mermaid generation calls.
- Added backend session state, async loading state, stale response guards, and user-safe error banners.
- Preserved local node label refinement and browser SVG rendering/export behavior.
- Updated component tests to mock the backend API while keeping deterministic local utilities covered.
- Documented active API integration, `VITE_PLANNING_API_BASE_URL`, and client-side render/export responsibilities.
- Pinned `jsdom` to `^26.1.0` to avoid the Node 20.18 / jsdom 29 ESM worker startup failure in Vitest.
- Fixed a time-sensitive backend persistence test fixture whose hardcoded 2026-04-30 expiry had become expired.
- Ran graphify update after code changes.

## Files Changed

- `src/features/planning/planningApiClient.ts`
- `src/features/planning/planningApiClient.test.ts`
- `src/features/planning/PlanningWorkspace.tsx`
- `src/features/planning/PlanningWorkspace.test.tsx`
- `src/features/planning/components/InputPanel.tsx`
- `src/features/planning/components/AnalysisPanel.tsx`
- `src/features/planning/components/MermaidOutputPanel.tsx`
- `src/features/planning/planningSchema.ts`
- `src/features/planning/planningContracts.md`
- `src/features/planning/planningContracts.test.ts`
- `src/vite-env.d.ts`
- `apps/backend/src/planning/planning.persistence.spec.ts`
- `package.json`
- `package-lock.json`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/graph.json`
- `graphify-out/graph.html`
- `.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md`

## Deviations

- The plan allowed optional server-side validation on local node edits. This was not implemented because Phase 6 has no backend node-refinement endpoint and local Mermaid rendering already preserves the existing UX.
- `jsdom` was pinned even though the plan expected no dependency change. This was required because `jsdom@29.1.0` failed before tests started under Node 20.18.0 with `ERR_REQUIRE_ESM` from `html-encoding-sniffer` requiring ESM-only `@exodus/bytes`.
- The backend persistence spec was updated outside the frontend surface because its idempotency fixture used a fixed expiry timestamp that is now expired relative to the current date.

## Validation Results

- `npm run test:run -- planningApiClient planningContracts PlanningWorkspace` - passed, 40 tests.
- `npm run test:run` - passed, 76 tests.
- `npm run typecheck` - passed.
- `npm run build` - passed. Warning: current Node is 20.18.0 while Vite recommends 20.19+ or 22.12+.
- `npm run backend:typecheck` - passed.
- `npm run backend:test` - passed, 57 tests. Watchman emitted a recrawl warning only.
- `npm run backend:test:e2e` - passed, 13 tests. Watchman emitted a recrawl warning only.
- `graphify update .` - passed; graph rebuilt with 368 nodes and 587 edges.
- `npm audit --audit-level=moderate` - failed due transitive `uuid <14` under `@langchain/langgraph@1.2.9`; npm's suggested fix requires `npm audit fix --force` and would install a breaking LangGraph downgrade.

## Design Review

Verdict: Approve.

- No CRITICAL/HIGH issues found.
- Loading and error states reuse existing `output-banner`, disabled button, and empty-state patterns.
- No CSS/theme changes were needed.
- Button text remains short and stable enough for the existing action row.

## Code Review

Verdict: Approve with noted residual risk.

- No CRITICAL/HIGH correctness or security issues found in the changed application code.
- API responses are schema-validated before use.
- User-provided planning text remains in JSON request bodies and is not interpolated into URLs or idempotency keys.
- Residual risk: `npm audit` still reports transitive LangGraph `uuid` advisories. The safe follow-up is to upgrade LangGraph dependencies when a non-breaking version path is available or verify whether the affected UUID APIs are reachable in this backend.

## Acceptance Criteria

- Analyze no longer calls local `analyzePlanningInput()` from `PlanningWorkspace` runtime.
- Initial Mermaid generation no longer calls local `generateMermaidFlow()` from `PlanningWorkspace` runtime.
- Existing panels remain intact for readiness, guidance, contradictions, suggestions, QA handoff, Mermaid code, preview, node refinement, copy, SVG export, and PNG export.
- Backend/network errors are user-visible and retryable.
- Stale analyze/generate responses are guarded by request IDs.
- Frontend API client validates success/failure envelopes.
- `VITE_PLANNING_API_BASE_URL` is typed and documented.

## Next Notes

- Manual browser verification against a live backend was not run in this session.
- Production/runtime environments should use Node 20.19+ or 22.12+ to satisfy Vite engine requirements.
