# AI User Flow Planner Phase 4 Refinement and Export Plan

## Summary and User Story

Phase 4 adds the refinement and export layer on top of the validated Mermaid generation pipeline. Phase 3 can generate and render an official Mermaid preview, but users still cannot edit a specific flow node, regenerate connected logic, copy Mermaid source with feedback, or export the rendered diagram as SVG/PNG with explicit failure handling.

As a PM, architect, or QA engineer, I want to refine individual generated flow nodes and export the validated diagram, so that I can turn AI-generated planning logic into shareable implementation artifacts without leaving the workspace.

## Metadata

- Complexity: High
- Source PRD: `.codex/PRPs/prds/ai-user-flow-planner.prd.md`
- PRD phase: Phase 4, Refinement and Export
- Estimated changed files: 8-12
- Primary modules: `src/features/planning`
- Current branch context: Phase 3 complete on `codex/phase-3-mermaid-renderer`

## UX Design

Before:

- Users can analyze MVP text, accept/reject edge-case suggestions, generate Mermaid code, and view an official Mermaid SVG preview.
- The generated diagram is read-only.
- Users must manually select code text to copy and have no SVG/PNG export control.

After:

- The Mermaid output panel includes a compact action row:
  - Copy Mermaid code
  - Export SVG
  - Export PNG
- Actions expose explicit status feedback: idle, working, success, failed.
- A node refinement panel lists editable generated nodes grouped by section, with labels such as Input, Analysis, Review, Exception Paths, and Output.
- Editing a node label updates the editable draft, regenerates Mermaid code, and re-renders the preview through the existing official Mermaid validation path.
- Editing generated exception nodes preserves accepted/rejected suggestion audit state; if source suggestions change, the draft is invalidated and regenerated from current analysis.
- Export actions are disabled when there is no rendered SVG and show actionable failure messages when browser APIs fail.

## Mandatory Reading

- `src/features/planning/PlanningWorkspace.tsx:10` owns raw text, analysis, reviewed suggestions, Mermaid document, and render request state.
- `src/features/planning/PlanningWorkspace.tsx:25` clears stale analysis and Mermaid output when input changes.
- `src/features/planning/PlanningWorkspace.tsx:50` generates and renders Mermaid output asynchronously with a stale request guard.
- `src/features/planning/components/MermaidOutputPanel.tsx:20` derives blocking/rendering/happy-path UI state.
- `src/features/planning/components/MermaidOutputPanel.tsx:47` renders the generation action row.
- `src/features/planning/components/MermaidOutputPanel.tsx:69` renders adapter-returned SVG through `dangerouslySetInnerHTML`.
- `src/features/planning/mermaidGenerator.ts:14` converts analysis and suggestions into a Mermaid document.
- `src/features/planning/mermaidGenerator.ts:48` builds the current string-based flowchart.
- `src/features/planning/mermaidRenderer.ts:44` validates and renders Mermaid code.
- `src/features/planning/planningSchema.ts:39` defines Mermaid render status.
- `src/features/planning/planningSchema.ts:49` defines the current Mermaid document shape.
- `src/features/planning/PlanningWorkspace.test.tsx:142` covers generation and preview behavior.
- `src/features/planning/PlanningWorkspace.test.tsx:190` covers stale output clearing.
- `src/styles.css:351` defines Mermaid output panel styles that export/refinement UI should extend.

## External Documentation Findings

- Clipboard writes should use the async Clipboard API in secure contexts; browser permission and transient activation requirements differ, so copy failures must be caught and surfaced.
  - Source: [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)
  - Source: [MDN Clipboard.writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText)
- SVG export can serialize a rendered SVG DOM node using `XMLSerializer.serializeToString()`.
  - Source: [MDN Parsing and serializing XML](https://developer.mozilla.org/docs/Web/XML/Guides/Parsing_and_serializing_XML)
- Downloadable SVG/PNG artifacts can be created from `Blob` values and object URLs; object URLs should be revoked after the download is triggered.
  - Source: [MDN URL.createObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static)
- PNG export should render SVG into an `HTMLImageElement`, draw it to a canvas, then call `HTMLCanvasElement.toBlob()`. The implementation must handle `toBlob()` returning `null` and image-load failures.
  - Source: [MDN CanvasRenderingContext2D.drawImage](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage)
  - Source: [MDN HTMLCanvasElement.toBlob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)

## Patterns to Mirror

Existing stale async render guard:

```ts
const requestId = renderRequestId.current + 1
renderRequestId.current = requestId
const renderedDocument = await renderMermaidDocument(generatedDocument.code)
if (renderRequestId.current !== requestId) {
  return
}
```

Existing output panel shape:

```tsx
<section className="analysis-section mermaid-output-section" aria-labelledby="mermaid-output-title">
  <div className="section-title-row">
    <h3 id="mermaid-output-title">Mermaid output</h3>
    <span className={`review-status ${statusText}`}>{statusText}</span>
  </div>
</section>
```

Existing official render result contract:

```ts
return mermaidDocumentSchema.parse({
  code,
  renderStatus: 'rendered',
  retryCount,
  renderError: null,
  svg,
  isHappyPathBiased: false,
  blockedReason: null
})
```

## Files to Change

- `src/features/planning/planningSchema.ts`
  - Add editable draft, node, edge, and export status schemas.
- `src/features/planning/mermaidGenerator.ts`
  - Split generation into draft creation and Mermaid serialization.
  - Preserve current `generateMermaidFlow` public behavior by delegating to the draft serializer.
- `src/features/planning/mermaidGenerator.test.ts`
  - Cover draft shape, node edits, and serialization.
- `src/features/planning/mermaidExport.ts`
  - New utility for copy, SVG download, PNG download, blob URL cleanup, and export errors.
- `src/features/planning/mermaidExport.test.ts`
  - New tests for copy success/failure, SVG export, PNG export failure branches, and object URL cleanup.
- `src/features/planning/PlanningWorkspace.tsx`
  - Store editable draft and export state.
  - Regenerate/re-render when a node label changes.
- `src/features/planning/PlanningWorkspace.test.tsx`
  - Add tests for node edit re-render, copy success/failure, SVG export, PNG export fallback.
- `src/features/planning/components/MermaidOutputPanel.tsx`
  - Add refinement controls and export actions using component composition instead of a large monolithic panel.
- `src/styles.css`
  - Extend existing compact panel styles for node list, action row, export status, and disabled states.
- `.codex/PRPs/reports/ai-user-flow-planner-phase-4-report.md`
  - Write implementation report after validation.
- `.codex/PRPs/prds/ai-user-flow-planner.prd.md`
  - Mark Phase 4 complete only after validation passes.

## NOT Building

- No full drag-and-drop diagram editor.
- No arbitrary Mermaid AST parser.
- No sequence diagram support.
- No persistent project storage.
- No server-side export service.
- No collaborative editing.
- No export to PDF.
- No custom canvas drawing of Mermaid content; PNG export must use the official rendered SVG as the source.

## Step-by-Step Tasks

### Task 1: Add Editable Draft Schemas

- ACTION: Extend planning schemas for a structured flow draft.
- IMPLEMENT: Add `flowNodeSchema`, `flowEdgeSchema`, `flowDraftSchema`, and `exportStatusSchema`.
- MIRROR: Keep Zod schema and inferred type style from `planningSchema.ts`.
- IMPORTS: Continue using `zod`.
- GOTCHA: Do not remove current `MermaidDocument` fields; existing Phase 3 tests depend on them.
- VALIDATE: `npm run typecheck`.

### Task 2: Refactor Generation Into Draft Plus Serializer

- ACTION: Preserve the current generated output while introducing editable internals.
- IMPLEMENT: Create functions such as `createMermaidDraft`, `serializeMermaidDraft`, and `updateMermaidDraftNode`.
- MIRROR: Reuse current node ids and section labels from `buildMermaidCode`.
- IMPORTS: Use local schema types only.
- GOTCHA: Accepted suggestions must still be the only exception nodes included; rejected suggestions stay visible in suggestion review, not the flow.
- VALIDATE: Existing `mermaidGenerator` tests still pass before adding new tests.

### Task 3: Add Node-Level Refinement State

- ACTION: Store the generated draft in `PlanningWorkspace`.
- IMPLEMENT: On generation, create draft, serialize to Mermaid, render, then store draft and document together. On node edit, update the draft immutably, serialize, set `rendering`, and re-render with the existing request id guard.
- MIRROR: Use the existing stale async guard in `PlanningWorkspace.tsx:55`.
- IMPORTS: Import the new generator helpers.
- GOTCHA: Editing input text, re-analysis, or suggestion status changes must clear both draft and export statuses.
- VALIDATE: Add a component test proving input changes remove edited draft output.

### Task 4: Split MermaidOutputPanel Into Focused Subcomponents

- ACTION: Keep UI maintainable as Phase 4 controls are added.
- IMPLEMENT: Extract small local components such as `MermaidActionRow`, `MermaidNodeEditor`, and `ExportStatusBanner` inside the component file or sibling files if the file grows too large.
- MIRROR: Follow current prop-driven React composition in `AnalysisPanel` and `MermaidOutputPanel`.
- IMPORTS: Type-only imports from planning schemas where possible.
- GOTCHA: Do not put tool panels inside tool panels; use existing section/card primitives.
- VALIDATE: `npm run test:run -- PlanningWorkspace`.

### Task 5: Implement Copy Mermaid Code

- ACTION: Add a Copy Mermaid action.
- IMPLEMENT: Use `navigator.clipboard.writeText(mermaidDocument.code)` when code exists. Catch errors and set export status to failed with a user-facing message.
- MIRROR: Keep state updates in `PlanningWorkspace` and display-only rendering in child components.
- IMPORTS: New helper from `mermaidExport.ts`.
- GOTCHA: Clipboard API can fail outside secure contexts or without user activation; do not silently swallow failures.
- VALIDATE: Test successful copy by mocking `navigator.clipboard.writeText`; test rejection shows failure status.

### Task 6: Implement SVG Export

- ACTION: Add an Export SVG action based on the official rendered SVG.
- IMPLEMENT: Serialize the rendered SVG or use the stored `mermaidDocument.svg`, create an `image/svg+xml` Blob, create an object URL, click a temporary anchor, and revoke the URL.
- MIRROR: Export should require `renderStatus === 'rendered'` and `svg !== null`.
- IMPORTS: `downloadTextArtifact` or equivalent helper from `mermaidExport.ts`.
- GOTCHA: Export must be disabled in fallback/blocked/rendering states.
- VALIDATE: Test Blob creation, URL cleanup, disabled state, and failure banner.

### Task 7: Implement PNG Export

- ACTION: Convert the rendered SVG into a PNG download.
- IMPLEMENT: Create a Blob URL for SVG, load it into an `Image`, draw to canvas, call `canvas.toBlob`, then download the PNG Blob and revoke all object URLs.
- MIRROR: Reuse SVG export filename logic.
- IMPORTS: `exportSvgToPng` helper.
- GOTCHA: Handle image `onerror`, missing canvas context, `toBlob(null)`, and URL cleanup in all branches.
- VALIDATE: Unit-test success and each failure branch using DOM mocks.

### Task 8: Add Export and Refinement UX Tests

- ACTION: Cover the critical user-facing workflows.
- IMPLEMENT: Add tests for:
  - node label edit updates generated code and calls renderer again
  - stale render result after a later edit is ignored
  - copy success and copy failure
  - SVG export disabled until rendered
  - PNG export failure keeps code/preview visible
- MIRROR: Existing Testing Library patterns in `PlanningWorkspace.test.tsx`.
- IMPORTS: Continue mocking `renderMermaidDocument` for component tests where deterministic rendering matters.
- GOTCHA: Do not test browser downloads by actually navigating; assert helper calls and status text.
- VALIDATE: `npm run test:run -- PlanningWorkspace mermaidExport mermaidGenerator`.

### Task 9: Update Styles and Accessibility

- ACTION: Add compact, responsive controls without visual clutter.
- IMPLEMENT: Extend existing CSS with stable dimensions for action buttons, node rows, status banners, and text inputs.
- MIRROR: Existing `.analysis-section`, `.generation-row`, `.output-banner`, `.review-status`, and `.muted` styles.
- IMPORTS: N/A.
- GOTCHA: Ensure long node labels wrap and action buttons do not overlap on mobile.
- VALIDATE: Run design review after UI changes.

### Task 10: Finalize PRP Artifacts

- ACTION: Record implementation evidence and close Phase 4.
- IMPLEMENT: Write `.codex/PRPs/reports/ai-user-flow-planner-phase-4-report.md`, update PRD status to complete, and move this plan to `.codex/PRPs/plans/completed/`.
- MIRROR: Phase 3 report and completed plan conventions.
- IMPORTS: N/A.
- GOTCHA: Run `graphify update .` after code changes.
- VALIDATE: `git diff --check`.

## Testing Strategy

- Unit:
  - Draft creation includes stable ids, node sections, and edges.
  - Node edits update only the targeted node and regenerate Mermaid code.
  - Copy helper succeeds/fails deterministically.
  - SVG export revokes object URLs.
  - PNG export covers success, image load failure, missing canvas context, and null blob.
- Component:
  - Refinement panel appears only after generation.
  - Editing a node updates Mermaid code and preview status.
  - Export actions are disabled until rendered.
  - Copy/SVG/PNG success and failure statuses are visible.
  - Input edits, re-analysis, and suggestion changes clear refinement/export state.
- Regression:
  - Finding 1 remains fixed: stale successful analysis must disappear on input change.
  - Finding 3 remains fixed: invalid Mermaid must never return rendered.

## Validation Commands

```bash
npm run typecheck
npm run test:run -- mermaidGenerator mermaidExport PlanningWorkspace
npm run test:run
npm run coverage
npm run build
npm audit --audit-level=moderate
git diff --check
graphify update .
```

Run `$design-review` after `.tsx` or `.css` changes, then `$code-review-workflow` before committing.

## Acceptance Criteria

- Users can edit generated flow node labels and see Mermaid code/preview update after official render validation.
- Input edits, re-analysis, and suggestion changes clear stale refinement/export state.
- Users can copy Mermaid code with success/failure feedback.
- Users can export SVG only when rendered SVG is available.
- Users can export PNG from the official rendered SVG.
- Export failures are visible and do not erase the code or preview.
- Existing Phase 1-3 behavior and tests remain passing.
- Coverage remains above 80%.
- Build, audit, design review, code review, and graphify update pass.

## Risks and Notes

- PNG export in jsdom requires DOM mocks; do not overfit tests to browser internals.
- Clipboard behavior differs across browsers and secure-context rules, so the UI must treat copy as fallible.
- Node-level edits should be scoped to generated labels for MVP. Arbitrary edge rewiring is out of scope.
- Dynamic Mermaid loading must remain intact; do not reintroduce a large eager Mermaid import.
- The `uuid` override should remain unless Mermaid removes the vulnerable transitive range upstream.
