# AI User Flow Planner Phase 3 Mermaid Renderer Remediation Plan

## Summary and User Story

Phase 3 is currently in progress because Mermaid code generation exists, but the production preview path does not yet use the official Mermaid renderer by default. The current renderer fails closed when no adapter is supplied, which prevents a false rendered state, but users still cannot validate that the generated code is the same diagram they will copy or export.

As a product planner or engineer, I want generated Mermaid code to be parsed and rendered by the official Mermaid implementation before the app marks it as rendered, so that syntax errors trigger the bounded correction/fallback path instead of producing a misleading preview.

## Metadata

- Complexity: Medium
- Source PRD: `.codex/PRPs/prds/ai-user-flow-planner.prd.md`
- PRD phase: Phase 3, Mermaid Generation and Render Validation
- Remediates review finding: P1, "Preview is not Mermaid rendering"
- Estimated changed files: 5-7
- Expected dependency change: add `mermaid` to production dependencies through the project package manager
- Current blocker: this Codex environment does not expose `npm` on PATH; implementation must use a real package manager install, not manual lockfile edits

## UX Design

Before:

- The app can generate Mermaid code and display fallback when the default renderer is unavailable.
- A rendered preview appears only when tests inject an adapter, not from the production dependency path.

After:

- Clicking `Generate Mermaid` parses and renders through the official Mermaid package.
- `rendered` is shown only when Mermaid returns SVG for the current code.
- `fallback` is shown when both the first render and one syntax-correction retry fail.
- The code block remains visible in fallback so the user can inspect or copy the generated Mermaid source.
- Existing stale-output protections remain: input edits, re-analysis, and suggestion changes clear previous Mermaid output.

## Mandatory Reading

- `src/features/planning/mermaidRenderer.ts:3` defines the adapter contract used by tests and production rendering.
- `src/features/planning/mermaidRenderer.ts:16` currently uses a fail-closed default adapter that reports Mermaid as unavailable.
- `src/features/planning/mermaidRenderer.ts:26` owns the bounded render, correction, and fallback loop.
- `src/features/planning/mermaidRenderer.ts:55` owns syntax normalization and must remain conservative.
- `src/features/planning/PlanningWorkspace.tsx:50` wires generation to rendering and protects against stale async responses.
- `src/features/planning/components/MermaidOutputPanel.tsx:60` displays fallback errors.
- `src/features/planning/components/MermaidOutputPanel.tsx:69` displays SVG only when `mermaidDocument.svg` exists.
- `src/features/planning/mermaidGenerator.ts:53` emits the flowchart syntax that must be accepted by Mermaid.
- `src/features/planning/mermaidRenderer.test.ts:32` covers renderer behavior and should be expanded for the official adapter path.
- `package.json:15` currently has no `mermaid` dependency.
- `.codex/PRPs/prds/ai-user-flow-planner.prd.md:281` keeps Phase 3 in progress until official rendering is validated.

## External Documentation Findings

- Official Mermaid API docs define top-level `initialize`, `parse`, and `render`; `mermaidAPI` is deprecated for external use. Use the top-level methods instead of `mermaid.mermaidAPI`.
  - Source: [Mermaid interface docs](https://mermaid.ai/open-source/config/setup/mermaid/interfaces/Mermaid.html)
- `parse(text, parseOptions)` validates diagram syntax, returns a parse result for valid diagrams, and throws unless `suppressErrors` is true.
  - Source: [Mermaid usage docs](https://mermaid.ai/open-source/config/usage.html)
- `render(id, text)` returns SVG and render calls are queued serially. The id must be unique per diagram.
  - Source: [Mermaid render docs](https://www.mintlify.com/mermaid-js/mermaid/api/methods/render)
- `initialize({ startOnLoad: false })` is the expected setup for programmatic rendering in an app.
  - Source: [Mermaid usage docs](https://mermaid.ai/open-source/config/usage.html)

## Patterns to Mirror

Existing adapter seam:

```ts
export interface MermaidAdapter {
  initialize: (config: Record<string, unknown>) => void
  parse: (code: string, options?: { suppressErrors?: boolean }) => unknown | Promise<unknown>
  render: (id: string, code: string) => Promise<{ svg: string }>
}
```

Existing fail-closed behavior to preserve when Mermaid cannot be loaded:

```ts
const defaultMermaidAdapter: MermaidAdapter = {
  initialize: () => undefined,
  parse: () => {
    throw new Error('Official Mermaid renderer is not configured in this environment.')
  },
  render: async () => {
    throw new Error('Official Mermaid renderer is not configured in this environment.')
  }
}
```

Existing stale async guard to preserve:

```ts
const requestId = renderRequestId.current + 1
renderRequestId.current = requestId
const renderedDocument = await renderMermaidDocument(generatedDocument.code)
if (renderRequestId.current !== requestId) {
  return
}
```

## Files to Change

- `package.json`
  - Add `mermaid` to `dependencies` using the repo package manager.
- `package-lock.json`
  - Update only through package manager install.
  - Do not manually edit dependency metadata.
- `src/features/planning/mermaidRenderer.ts`
  - Add an official Mermaid adapter factory/import path.
  - Make the default production path use official Mermaid when available.
  - Keep fail-closed fallback if the dependency cannot be initialized.
- `src/features/planning/mermaidRenderer.test.ts`
  - Add tests for official-adapter shape, parse/render success, parse rejection, render exception, and no false `rendered` state.
- `src/features/planning/PlanningWorkspace.test.tsx`
  - Keep existing mocked render tests; add or adjust coverage only if public behavior changes.
- `.codex/PRPs/reports/ai-user-flow-planner-phase-3-report.md`
  - Update after validation with actual Mermaid render evidence.
- `.codex/PRPs/prds/ai-user-flow-planner.prd.md`
  - Mark Phase 3 complete only after official Mermaid validation passes.

## NOT Building

- No CDN-loaded Mermaid bundle.
- No hand-written SVG preview renderer.
- No custom Mermaid parser beyond the existing small syntax correction helper.
- No Phase 4 export work.
- No node-level interactive refinement.
- No server-side rendering service.
- No visual redesign outside the minimal status/fallback behavior already implemented.

## Step-by-Step Tasks

### Task 1: Resolve Dependency Installation Cleanly

- ACTION: Confirm the available package manager for this repo.
- IMPLEMENT: Run a real install command to add Mermaid, for example `npm install mermaid` once npm is available.
- MIRROR: Follow existing `package.json` dependency style under `dependencies`.
- IMPORTS: None.
- GOTCHA: Do not hand-edit `package-lock.json`; the current worktree already shows lockfile drift and must be reconciled before commit.
- VALIDATE: `git diff -- package.json package-lock.json` shows `mermaid` added coherently and no unrelated dependency removals.

### Task 2: Add the Official Mermaid Adapter

- ACTION: Wire production rendering to the Mermaid package.
- IMPLEMENT: Import Mermaid from `mermaid` and create an adapter that delegates to `initialize`, `parse`, and `render`.
- MIRROR: Keep the existing `MermaidAdapter` interface so tests can still inject deterministic adapters.
- IMPORTS: `import mermaid from 'mermaid'`
- GOTCHA: Use top-level `parse` and `render`; do not use deprecated `mermaidAPI`.
- VALIDATE: TypeScript accepts the adapter without `any` except where Mermaid's published type forces an adapter boundary.

### Task 3: Preserve Fail-Closed Fallback

- ACTION: Ensure missing or failed Mermaid initialization never produces `rendered`.
- IMPLEMENT: If the official adapter cannot parse/render, return the existing `fallback` document shape after one correction retry.
- MIRROR: Preserve `renderMermaidDocument` result contract in `src/features/planning/mermaidRenderer.ts:26`.
- IMPORTS: No new UI imports.
- GOTCHA: The UI uses `dangerouslySetInnerHTML` only for SVG returned by the official renderer; do not assign generated Mermaid text to `svg`.
- VALIDATE: The existing no-adapter fallback test still passes or is replaced by an equivalent explicit unavailable-adapter test.

### Task 4: Add Actual Mermaid Validation Tests

- ACTION: Extend renderer tests to prove the official adapter path behaves like Mermaid.
- IMPLEMENT: Add tests that call `renderMermaidDocument` with the default production adapter after `mermaid` is installed.
- MIRROR: Keep existing injected-adapter unit tests for retry/fallback determinism.
- IMPORTS: The test may import `mermaid` only indirectly through `renderMermaidDocument`, unless an explicit adapter-factory unit test is added.
- GOTCHA: Mermaid rendering may require DOM APIs under Vitest; keep `jsdom` test environment and avoid Node-only assumptions.
- VALIDATE: Valid flowchart code returns `renderStatus: 'rendered'` with SVG; invalid code returns `fallback` and never sets `svg`.

### Task 5: Revalidate Workspace Behavior

- ACTION: Confirm PlanningWorkspace still clears stale Mermaid output and displays fallback/rendered states correctly.
- IMPLEMENT: Adjust `PlanningWorkspace.test.tsx` only for changed text or status timing.
- MIRROR: Preserve `renderRequestId` logic in `src/features/planning/PlanningWorkspace.tsx:14`.
- IMPORTS: No new runtime imports in the component.
- GOTCHA: Do not reintroduce stale successful analysis from the previous P1 finding.
- VALIDATE: Existing workspace tests pass, especially input-change clearing and render fallback assertions.

### Task 6: Update Phase Evidence

- ACTION: Update Phase 3 report and PRD only after tests/build pass.
- IMPLEMENT: Record official Mermaid validation evidence in the report.
- MIRROR: Keep PRD phase status conventions from existing Phase 1 and Phase 2 sections.
- IMPORTS: N/A.
- GOTCHA: Do not mark Phase 3 complete until the real Mermaid dependency path is tested.
- VALIDATE: PRD Phase 3 status and report match the actual implementation state.

## Testing Strategy

- Unit tests:
  - `correctMermaidSyntax` normalizes only known safe cases.
  - Official adapter returns `rendered` for valid flowchart code.
  - Official adapter returns `fallback` for invalid Mermaid after one correction retry.
  - Render exceptions do not produce SVG or `rendered`.
- Integration/component tests:
  - Generate button moves through render state and shows rendered SVG when renderer succeeds.
  - Fallback banner appears when Mermaid cannot render.
  - Input edits clear prior analysis and Mermaid output.
  - Suggestion status changes clear prior Mermaid output.
- Regression tests:
  - No false-positive rendered state without a valid SVG.
  - Blocking contradictions still prevent generation.

## Validation Commands

Use repo scripts when `npm` is available:

```bash
npm install mermaid
npm run typecheck
npm run test:run
npm run coverage
npm run build
git diff --check
```

Current environment fallback commands using bundled Node:

```bash
/Users/yeomjaeheon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -b
/Users/yeomjaeheon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run
/Users/yeomjaeheon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run --coverage
/Users/yeomjaeheon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vite/bin/vite.js build
git diff --check
```

Graph update:

```bash
graphify update .
```

If `graphify` is unavailable, document the command failure in the implementation report.

## Acceptance Criteria

- `mermaid` is present in `dependencies` and lockfile changes are package-manager generated.
- Production `renderMermaidDocument(code)` uses official Mermaid `parse` and `render` by default.
- Invalid Mermaid code cannot return `renderStatus: 'rendered'`.
- Rendered preview SVG is the official Mermaid SVG for the generated code.
- The bounded self-correction loop performs at most one correction attempt before fallback.
- Existing stale-state protections remain intact.
- Typecheck, tests, coverage, build, and `git diff --check` pass.
- Phase 3 report includes validation evidence.

## Risks and Notes

- Mermaid may rely on browser DOM measurements; Vitest must run with jsdom.
- Mermaid's API evolves; prefer published top-level methods and keep the local adapter small.
- The current lockfile diff removes optional peer metadata without a matching `package.json` change. Reconcile this before any commit.
- SVG insertion uses `dangerouslySetInnerHTML`; only assign SVG returned by Mermaid's renderer, with `securityLevel: 'strict'` and `htmlLabels: false`.
- The prior stale-analysis P1 is already addressed in `PlanningWorkspace.tsx:25` by clearing analysis and Mermaid output on input changes.
- The duplicate Graphify P3 is not present in the current `AGENTS.md` Graphify section and is outside this remediation scope.
