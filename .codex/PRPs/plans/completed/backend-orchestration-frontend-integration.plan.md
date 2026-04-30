# Backend Orchestration Frontend Integration Plan

## Summary

Implement Phase 6 of the backend orchestration PRD: migrate the React planning workspace from local analysis and Mermaid generation helpers to the NestJS planning API while preserving the current readiness, suggestion review, QA handoff, Mermaid output, node refinement, copy, SVG export, and PNG export panels.

User story: as a product planner, I can paste rough MVP notes, run backend-backed analysis, review generated gaps, generate backend-validated Mermaid code, refine labels, and export the rendered diagram without learning that orchestration moved behind an API boundary.

## Metadata

- Complexity: High
- Source PRD: `.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md`
- PRD phase: `6. Frontend integration`
- Plan artifact: `.codex/PRPs/plans/backend-orchestration-frontend-integration.plan.md`
- Estimated files: 8-12 files
- Primary runtime: React + Vite frontend calling NestJS backend
- Current baseline: backend phases 1-5 are complete; frontend still uses local `analyzePlanningInput()`, `generateMermaidFlow()`, `createMermaidDraft()`, `serializeMermaidDraft()`, and `updateMermaidDraftNode()` directly.

## UX Design

Before:

- Analyze is synchronous and local.
- Generate Mermaid is local, then client-side render validation creates the SVG preview.
- Node edits update the local `FlowDraft`, serialize locally, and render locally.
- API fields and session IDs are invisible because the frontend never calls the backend.

After:

- Analyze creates a backend planning session, runs backend analysis, and hydrates the same visible `PlanningAnalysis` panels from the returned session snapshot.
- Generate Mermaid calls backend generation with the current reviewed suggestion statuses embedded in the session snapshot, receives backend-validated `flowDraft` and `mermaidDocument.code`, then keeps client-side rendering for SVG preview and export.
- Node label edits remain local in this phase unless the backend adds a node-refinement endpoint later; edited Mermaid is validated/rendered locally to preserve current low-latency UX.
- Loading/error states are visible only as compact panel feedback and disabled buttons. Do not redesign the page or add a landing page.

## Mandatory Reading

- `.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:391` - implementation phases show Phase 6 as the next pending frontend migration.
- `.codex/PRPs/prds/backend-orchestration-mermaid-generation.prd.md:333` - API endpoint table defines create, analyze, generate, validate, and fetch session routes.
- `graphify-out/GRAPH_REPORT.md:22` - current architecture hubs include `PlanningService`, `InMemoryPlanningPersistence`, `RedisPlanningPersistence`, `getIdempotencyKey()`, and Mermaid generation/validation modules.
- `src/features/planning/PlanningWorkspace.tsx:24` - central workspace state currently owns raw text, analysis, reviewed suggestions, Mermaid document, flow draft, export status, and stale request cancellation via `renderRequestId`.
- `src/features/planning/PlanningWorkspace.tsx:33` - `handleAnalyze()` calls local `analyzePlanningInput(rawText)` and resets Mermaid state synchronously.
- `src/features/planning/PlanningWorkspace.tsx:73` - `handleGenerateMermaid()` calls local generation, local draft creation, then `renderMermaidDocument()`.
- `src/features/planning/PlanningWorkspace.tsx:116` - node label edits are local draft edits plus local Mermaid rendering.
- `src/features/planning/planningSchema.ts:33` - frontend source-of-truth request schema accepts `rawText` plus optional nine planning elements.
- `src/features/planning/planningSchema.ts:254` - `planningSessionSnapshotSchema` contains `analysis`, `dependencyAnalysis`, `entities`, `stateMachine`, `validation`, `flowDraft`, and `mermaidDocument`.
- `src/features/planning/planningSchema.ts:287` - frontend currently has response envelope schemas for session, analysis, and Mermaid generation.
- `src/features/planning/planningContracts.ts:18` - local normalization and snapshot helpers exist, but should become test/reference utilities rather than the runtime API path.
- `src/features/planning/planningContracts.md:48` - endpoint mapping exists but still calls the routes "future" and says the workspace remains local-only.
- `src/features/planning/components/InputPanel.tsx:11` - input component currently only supports raw text and a single Analyze action.
- `src/features/planning/components/AnalysisPanel.tsx:40` - empty/analyzed states are driven by `analysis: PlanningAnalysis | null`.
- `src/features/planning/components/MermaidOutputPanel.tsx:32` - generation controls derive blocked/rendering/export eligibility from analysis, suggestions, and `MermaidDocument`.
- `apps/backend/src/planning/planning.controller.ts:5` - backend route prefix is `api/planning-sessions`.
- `apps/backend/src/planning/planning.service.ts:52` - `POST /api/planning-sessions` returns `createSuccessEnvelope(snapshot)`.
- `apps/backend/src/planning/planning.service.ts:100` - analyze accepts `{ session }`, `{ input }`, or `{}` when persistence can load the route session.
- `apps/backend/src/planning/planning.service.ts:180` - Mermaid generation returns a full updated `PlanningSessionSnapshot`, not just `{ flowDraft, mermaidDocument, validation }`.
- `apps/backend/src/planning/planning.service.ts:150` - Mermaid validate returns `{ mermaidDocument, validation }` and no SVG.
- `apps/backend/src/main.ts:11` - backend CORS allows `FRONTEND_ORIGIN`, defaulting to `http://localhost:5173`.
- `apps/backend/src/config/app.config.ts:17` - backend default API port is `3001`.
- `apps/backend/test/planning.e2e-spec.ts:211` - e2e already proves create -> analyze -> generate can work through persisted session state without resending snapshots.
- `src/features/planning/PlanningWorkspace.test.tsx:25` - existing UI tests are local-behavior focused and must be converted/extended around mocked API calls.

## External Documentation Findings

- Vite exposes client environment variables on `import.meta.env`, and only variables prefixed with `VITE_` are exposed to client code. Use `VITE_PLANNING_API_BASE_URL` for the backend base URL. Source: [Vite Env Variables and Modes](https://vite.dev/guide/env-and-mode/).
- `AbortController` can abort fetch requests and response body consumption. Use it, or an equivalent request-id guard, so stale analyze/generate responses cannot overwrite newer input state. Source: [MDN AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
- Vitest supports `vi`-based mocks and browser API test doubles; keep API client tests focused by mocking `fetch` or the client module rather than requiring a live backend in frontend unit tests. Source: [Vitest Mocking Guide](https://v2.vitest.dev/guide/mocking).

## Patterns To Mirror

### Request staleness guard

Source: `src/features/planning/PlanningWorkspace.tsx:78`

```ts
const requestId = renderRequestId.current + 1
renderRequestId.current = requestId
```

Keep this pattern for both analyze and generate. Backend calls are slower than local helpers, so stale response suppression becomes more important, not less.

### Immutable suggestion status updates

Source: `src/features/planning/PlanningWorkspace.tsx:59`

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

When generating Mermaid, build a new session snapshot with updated `analysis.suggestions`. Do not mutate the backend snapshot held in state.

### Backend success envelope

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

The frontend client should parse this envelope and throw a typed, user-safe error for `success: false`.

### Backend full-snapshot generation response

Source: `apps/backend/src/planning/planning.service.ts:211`

```ts
const nextSnapshot = planningSessionSnapshotSchema.parse({
  ...snapshot,
  status: nextStatus,
  stateMachine,
  flowDraft: generation.flowDraft,
  mermaidDocument: generation.mermaidDocument,
  validation: generation.validation
})
```

Do not rely on the older frontend `mermaidGenerationResponseSchema` shape alone. The runtime `/mermaid` response envelope data is the updated session snapshot.

### Client-side SVG rendering remains necessary

Source: `apps/backend/src/planning/planning.service.ts:174`

```ts
return createSuccessEnvelope({
  mermaidDocument,
  validation
})
```

Backend validation returns Mermaid code/status and `svg: null`; `renderMermaidDocument(code)` should still run in the browser before copy/export buttons are enabled.

## Files To Change

- `src/features/planning/planningApiClient.ts` - new typed client for planning API base URL, envelopes, idempotency keys, fetch errors, and schema parsing.
- `src/features/planning/planningApiClient.test.ts` - unit tests for create/analyze/generate/validate success, failure envelopes, invalid payloads, network failures, and base URL normalization.
- `src/features/planning/planningSchema.ts` - add missing response schemas if needed: full `PlanningSessionResponse`, `MermaidValidationResponse`, and a corrected generation response alias that matches current backend full-snapshot behavior.
- `src/features/planning/PlanningWorkspace.tsx` - replace local analyze/generate runtime calls with API client calls, add session snapshot/error/loading state, keep client render/export behavior, and keep local node-label refinement.
- `src/features/planning/PlanningWorkspace.test.tsx` - update tests to mock the API client and cover loading, backend error display, stale response suppression, successful analysis, backend generation plus local render, blocked generation, and local node edits.
- `src/features/planning/components/InputPanel.tsx` - accept analyze loading/disabled/error props if this remains the best place to show pending state.
- `src/features/planning/components/AnalysisPanel.tsx` and/or `src/features/planning/components/MermaidOutputPanel.tsx` - accept generation error/loading state if the workspace should display backend failures near the output controls.
- `src/features/planning/planningContracts.md` - update from "future/local-only" to the active API integration contract and document `VITE_PLANNING_API_BASE_URL`.
- `src/vite-env.d.ts` - add `ImportMetaEnv` typing for `VITE_PLANNING_API_BASE_URL`.
- `src/test/setup.ts` - add or reset fetch mocks only if tests use a global `fetch` mock instead of mocking `planningApiClient`.
- `package.json` - no new dependency expected; only script changes if a dedicated integration command is added.
- `.codex/PRPs/reports/backend-orchestration-frontend-integration-report.md` - implementation report after Phase 6 is complete.

## NOT Building

- New backend endpoints for suggestion patching or node refinement.
- Server-side SVG/PNG export.
- A redesigned nine-field form; Phase 6 may send `rawText` only unless the UI already collects elements.
- Authentication UI, user accounts, SSO, workspaces, billing, or collaboration.
- RAG/template retrieval UI.
- Replacing browser Mermaid rendering for preview/export.
- Migrating all local analyzer/generator tests away from deterministic unit coverage; keep those tests for local utilities until they are formally removed.

## Step-By-Step Tasks

### Task 1 - Add Typed API Client Schemas

- ACTION: Define the frontend client contract before touching workspace state.
- IMPLEMENT: Add `planningApiClient.ts` with `PlanningApiClientError`, `getPlanningApiBaseUrl()`, `createPlanningSession(input)`, `analyzePlanningSession(sessionId, request)`, `generatePlanningMermaid(sessionId, request)`, and `validatePlanningMermaid(sessionId, request)`. Parse success envelopes through Zod schemas from `planningSchema.ts`.
- MIRROR: `planningSchema.ts:287` response envelope schemas and `planningContracts.ts:55` envelope construction, but use parsing only in the client.
- IMPORTS: `z`, `planningInputSchema`, `planningSessionResponseSchema`, `planningSessionSnapshotSchema`, `apiFailureEnvelopeSchema`.
- GOTCHA: `POST /api/planning-sessions/:sessionId/mermaid` currently returns `PlanningSessionSnapshot`; do not parse it as `{ flowDraft, mermaidDocument, validation }` unless backend changes first.
- VALIDATE: Client tests cover base URL default `http://localhost:3001`, trailing slash trimming, `VITE_PLANNING_API_BASE_URL`, failure envelope messages, malformed success payloads, and network rejection.

### Task 2 - Add Idempotency and Abort Support

- ACTION: Make client requests safe for retries and stale UI responses.
- IMPLEMENT: Generate idempotency keys for create/analyze/generate calls using deterministic prefixes plus a unique suffix. Accept optional `AbortSignal` in client methods and pass it to `fetch`.
- MIRROR: Backend idempotency header use in `apps/backend/src/planning/planning.controller.ts:11` and `apps/backend/src/planning/planning.service.ts:52`.
- IMPORTS: Browser `crypto.randomUUID` with fallback to `Date.now()` plus a counter if test environments lack UUID support.
- GOTCHA: Do not put raw planning text in idempotency keys. Keep user text only in the JSON body.
- VALIDATE: Tests assert `Idempotency-Key` is set, request bodies are JSON, and abort errors are converted into a non-persistent UI state rather than a visible validation error.

### Task 3 - Introduce Workspace Session and Request State

- ACTION: Extend `PlanningWorkspace` state to track backend session lifecycle without changing panel data contracts.
- IMPLEMENT: Add `planningSession: PlanningSessionSnapshot | null`, `analysisStatus: 'idle' | 'loading' | 'success' | 'failed'`, `generationStatus`, and `operationError: string | null` or split errors by panel. Reset session, analysis, suggestions, Mermaid document, flow draft, export status, and errors on raw text changes.
- MIRROR: Existing reset behavior in `PlanningWorkspace.tsx:44`.
- IMPORTS: `PlanningSessionSnapshot` from `planningSchema`, API client functions.
- GOTCHA: Keep `analysis` and `reviewedSuggestions` as the props consumed by existing panels. Do not force `AnalysisPanel` to understand full backend snapshots unless the UI actually displays dependency/entity/state-machine metadata.
- VALIDATE: Component tests prove input changes clear backend session/error/output state and leave Analyze disabled for empty input.

### Task 4 - Replace Local Analyze Runtime With Backend Create + Analyze

- ACTION: Move the Analyze button flow to the backend.
- IMPLEMENT: `handleAnalyze()` should create a session from `{ rawText }`, then call `analyzePlanningSession(session.id, {})`, then set `planningSession`, `analysis`, and `reviewedSuggestions` from the analyzed snapshot. If create returns `needs_clarification` due prompt-injection or insufficient input and analyze is unnecessary, either display `snapshot.analysis` when present or create a small compatibility analysis only if the backend does not provide one; prefer backend analysis when available.
- MIRROR: Backend body-less persisted analyze path proven by `apps/backend/test/planning.e2e-spec.ts:211`.
- IMPORTS: `createPlanningSession`, `analyzePlanningSession`.
- GOTCHA: Current backend `createPlanningSession()` returns `analysis: null`; the frontend cannot render guidance from create alone. For insufficient but safe text, call analyze with `{ input: createdSnapshot.input }` if body-less analyze blocks on missing AI/config in a local test setup, or rely on body-less persisted analyze in normal backend mode.
- VALIDATE: Tests mock create/analyze success and verify the same visible readiness, personas, actions, suggestions, contradictions, and QA handoff panels as current local tests.

### Task 5 - Preserve Suggestion Review in the Generation Request

- ACTION: Ensure accepted/rejected suggestion status is sent to backend generation.
- IMPLEMENT: Before calling generate, create an immutable `sessionForGeneration` from the latest `planningSession` with `analysis.suggestions` replaced by `reviewedSuggestions`. Send `{ session: sessionForGeneration }` to `generatePlanningMermaid(session.id, ...)`.
- MIRROR: Current local generation input in `PlanningWorkspace.tsx:81`, which passes `analysis` plus `reviewedSuggestions`.
- IMPORTS: `planningSessionSnapshotSchema` for defensive parse before the API call.
- GOTCHA: If `planningSession.analysis` is null, block generation with a user-safe error. If the backend returns `flowDraft: null` for blocked generation, preserve the blocked `mermaidDocument` and do not run client rendering.
- VALIDATE: Tests cover accepted suggestions included in the sent session and rejected suggestions omitted from generated recovery paths in the mocked backend response.

### Task 6 - Replace Local Mermaid Generation With Backend Generate + Local Render

- ACTION: Use backend Mermaid validation while retaining browser SVG rendering.
- IMPLEMENT: `handleGenerateMermaid()` should call `generatePlanningMermaid()`, store the returned snapshot, set `flowDraft` from `snapshot.flowDraft`, set a temporary `mermaidDocument` with `renderStatus: 'rendering'` when backend status is `generated`, run `renderMermaidDocument(snapshot.mermaidDocument.code)`, then merge the rendered SVG/status with backend metadata such as `isHappyPathBiased`, `retryCount`, `blockedReason`, and `renderError`.
- MIRROR: Existing local render flow in `PlanningWorkspace.tsx:99`.
- IMPORTS: `generatePlanningMermaid`, `renderMermaidDocument`.
- GOTCHA: Backend `renderStatus: 'generated'` means parser validation passed, not that an SVG exists. Export buttons must remain disabled until local render returns `rendered` with SVG.
- VALIDATE: Tests cover generated -> rendering -> rendered, backend blocked response, backend fallback response, render fallback after backend generated code, and stale generate response suppression.

### Task 7 - Keep Node Label Edits Local and Optionally Validate Server-Side

- ACTION: Preserve current node refinement UX without requiring a missing backend node endpoint.
- IMPLEMENT: Keep `updateMermaidDraftNode()` and `serializeMermaidDraft()` for node edits. Continue local `renderMermaidDocument(code)`. Optionally call `validatePlanningMermaid(sessionId, { code })` after serialization only if it does not create perceptible lag; local render is enough for Phase 6 acceptance.
- MIRROR: Current node edit flow in `PlanningWorkspace.tsx:116`.
- IMPORTS: Existing local Mermaid generator helpers, optional `validatePlanningMermaid`.
- GOTCHA: A node edit creates a local draft that may diverge from the backend snapshot. Track this as local UI state only; do not overwrite `planningSession.flowDraft` unless a future endpoint persists edits.
- VALIDATE: Existing node edit test should still pass, with API mocks asserting no generation endpoint is called during label edits.

### Task 8 - Add Loading and Error UI Without Layout Redesign

- ACTION: Surface network/backend failures clearly inside existing panels.
- IMPLEMENT: Disable Analyze while analysis is loading. Disable Generate while generation is loading or rendering. Add compact error banners near the relevant action row. Use backend `error.message` when available, falling back to generic user-safe text.
- MIRROR: Existing output banners in `MermaidOutputPanel.tsx:48` and export status banner in `MermaidOutputPanel.tsx:144`.
- IMPORTS: No new visual library expected.
- GOTCHA: Do not expose backend `details` arrays containing validation internals unless they are already user-safe. Log details only in tests/dev if needed.
- VALIDATE: Tests cover create failure, analyze failure, generate failure, retry after failure, and stale failure suppression after input changes.

### Task 9 - Update Contract Documentation and Env Typing

- ACTION: Keep project docs accurate after the runtime path changes.
- IMPLEMENT: Update `planningContracts.md` to say endpoints are active, document `VITE_PLANNING_API_BASE_URL`, note that `/mermaid` returns a full session snapshot, and state that SVG preview/export still renders client-side. Add `ImportMetaEnv` typing in `src/vite-env.d.ts`.
- MIRROR: Existing contract table in `planningContracts.md:48`.
- IMPORTS: N/A.
- GOTCHA: Do not duplicate backend PRD content; document only what frontend implementers need.
- VALIDATE: Typecheck should catch incorrect `import.meta.env` typing.

### Task 10 - Verification and Report

- ACTION: Validate the integration in unit, type, build, and backend e2e lanes, then write the implementation report.
- IMPLEMENT: Run frontend tests, frontend typecheck/build, backend typecheck, and backend e2e tests. If feasible, manually run backend and frontend together and exercise create/analyze/generate/export once.
- MIRROR: Existing scripts in `package.json:9` and backend scripts in `apps/backend/package.json:6`.
- IMPORTS: N/A.
- GOTCHA: Live AI extraction may require `OPENAI_API_KEY`; tests should mock the AI client and frontend API calls. Manual local runs without a key may use deterministic fallback only if the backend path supports it.
- VALIDATE: Commands listed below pass, and `.codex/PRPs/reports/backend-orchestration-frontend-integration-report.md` records changed files, validation evidence, and any known follow-up.

## Testing Strategy

- Unit test `planningApiClient.ts` with mocked `fetch`, covering success envelopes, failure envelopes, invalid JSON, invalid schema, network errors, aborts, base URL normalization, and headers.
- Update `PlanningWorkspace.test.tsx` to mock API client methods instead of local analyzer/generator runtime behavior for integration flows. Keep existing local utility tests for `planningAnalyzer`, `mermaidGenerator`, `mermaidRenderer`, and exports.
- Add regression coverage for stale async results: older analyze/generate responses must not overwrite newer raw text or newer generation requests.
- Keep backend e2e tests as the cross-process API contract guard. Add frontend-only tests for shape parsing; do not require a live Nest app from Vitest.
- Run design review after UI changes because `PlanningWorkspace.tsx`, `InputPanel.tsx`, `AnalysisPanel.tsx`, or `MermaidOutputPanel.tsx` may change.

## Validation Commands

```bash
npm run test:run -- PlanningWorkspace planningApiClient planningContracts
npm run typecheck
npm run build
npm run backend:typecheck
npm run backend:test
npm run backend:test:e2e
graphify update .
```

Manual verification, if local runtime is available:

```bash
npm run backend:dev
VITE_PLANNING_API_BASE_URL=http://localhost:3001 npm run dev
```

Then verify in browser:

- Paste sufficient MVP notes.
- Analyze returns backend-derived readiness/suggestions.
- Accept one suggestion.
- Generate returns Mermaid code and renders SVG.
- Edit one node label and confirm code/preview update.
- Copy Mermaid and export SVG/PNG.

## Acceptance Criteria

- Analyze no longer calls `analyzePlanningInput()` at runtime from `PlanningWorkspace`; it uses backend create/analyze API calls.
- Generate no longer calls `generateMermaidFlow()` for initial generation; it uses backend `/mermaid` and local rendering only for SVG preview/export.
- Existing UI panels remain functionally intact: readiness, guidance, contradictions, suggestion review, QA handoff, Mermaid code, preview, node refinement, copy, SVG export, and PNG export.
- Backend errors and network failures are user-visible, retryable, and do not leave stale loading states.
- Stale analyze/generate responses cannot overwrite newer input or newer output.
- Frontend API client validates response envelopes and rejects malformed backend payloads.
- `VITE_PLANNING_API_BASE_URL` is documented and typed; default backend URL is `http://localhost:3001`.
- Frontend and backend validation commands pass.
- A Phase 6 report is saved under `.codex/PRPs/reports/`.

## Risks and Notes

- Backend create currently returns no `analysis`; if analyze is unavailable due missing AI configuration, the frontend cannot show existing local guidance unless a compatibility fallback is intentionally kept. Prefer solving this with backend fallback behavior rather than silently returning to local analysis.
- The frontend `mermaidGenerationResponseSchema` currently describes `{ flowDraft, mermaidDocument, validation }`, while backend generation returns a full session snapshot. Align schemas before runtime integration to avoid false confidence.
- Backend validation does not produce SVG. Browser rendering remains required for current export actions.
- Suggestion status is not persisted through a dedicated backend endpoint. Passing a full updated snapshot to `/mermaid` is acceptable for Phase 6 but should be documented as a temporary contract.
- Node edits are local-only after generation. Persisted editable diagram state is out of scope until a backend node refinement endpoint exists.
- CORS defaults assume Vite on `http://localhost:5173` and Nest on `http://localhost:3001`; production deploys must set both `FRONTEND_ORIGIN` and `VITE_PLANNING_API_BASE_URL`.
