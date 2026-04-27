# AI User Flow Planner Phase 1 Implementation Plan

## Summary

Implement Phase 1 from the AI User Flow Planner PRD: a first usable web app that accepts rough MVP planning text, validates minimum completeness, extracts personas/entities/actions/states into structured JSON, and shows guidance when input is too vague.

This repository currently has no application source files, package manifest, or build configuration. Phase 1 therefore includes creating a minimal React + TypeScript + Vite app skeleton, then implementing the input parsing and completeness gate as deterministic local logic. LLM orchestration, edge-case generation, Mermaid generation, and export are explicitly deferred to later PRD phases.

## User Story

As an early founder or product planner, I want to paste rough MVP notes into a focused planning interface and immediately see whether the notes contain enough information to generate a useful flow, so that I can fix missing basics before asking AI to produce diagrams or exception paths.

## Metadata

- Complexity: Medium
- Source PRD: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md`
- PRD phase: Phase 1, Input Parsing and Completeness Gate
- Estimated files: 18-24 new app/test/config files, 1 PRD status update already made
- Main deliverable: deterministic Phase 1 frontend with tested parsing/completeness logic
- Target stack: React, TypeScript, Vite, Vitest, React Testing Library, Zod

## UX Design

Before:

- The repository contains planning docs and agent rules only.
- There is no runnable product UI.

After:

- First viewport is the actual planning workspace, not a marketing landing page.
- Left/main panel contains a labeled multiline MVP text area, example placeholder text, character count, and an `Analyze` button.
- Right/secondary panel shows one of three states:
  - Empty state: concise prompt to paste MVP notes.
  - Guidance state: missing fields and minimum information requirements when input is too short or vague.
  - Analysis state: extracted personas, entities, actions, and state candidates in grouped sections.
- The UI should use compact SaaS-tool layout: dense, readable panels, clear controls, no oversized hero, no decorative gradient orbs.
- Text area must be controlled with a string state from first render to avoid controlled/uncontrolled transitions.

## Mandatory Reading

- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/AGENTS.md:45` for required rule files before implementation.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/AGENTS.md:116` for the project development workflow.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/AGENTS.md:138` for graphify requirements. Documentation-only changes do not require `graphify update`, but code changes after implementation do.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md:19` for the proposed MVP behavior.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md:44` for open questions and assumptions.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md:79` for core entities.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md:103` for required exception paths.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md:114` for Must Have items.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md:214` for frontend/backend validation direction.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md:253` for implementation phases.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/rules/common/coding-style.md:3` for immutability.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/rules/common/coding-style.md:51` for input validation.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/rules/common/testing.md:10` for TDD workflow.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/rules/typescript/coding-style.md:12` for explicit TypeScript API types.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/rules/typescript/coding-style.md:178` for Zod boundary validation.
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/rules/typescript/testing.md:12` for Playwright as later E2E framework.

## External Documentation Findings

- Vite official docs list `react-ts` as a supported template and note Vite currently requires Node.js `20.19+` or `22.12+`. Plan validation should check local Node before installing.
- Vitest official docs say tests default to `.test.` or `.spec.` filenames and that Vitest reads `vite.config.*` by default; keep test config in `vite.config.ts` unless it becomes noisy.
- Zod official docs describe Zod 4 as TypeScript-first schema validation and require TypeScript `strict` mode; configure `tsconfig` with `strict: true`.
- React official textarea docs require controlled textareas to receive a string `value` plus synchronous `onChange`; initialize state as `''`.
- React Testing Library encourages tests that query DOM the way users do; use labels, roles, and visible text over implementation details.
- Testing Library user-event v14 simulates real interactions more completely than low-level event dispatch; use it for typing into the MVP text area and clicking Analyze.

References:

- https://vite.dev/guide/
- https://vitest.dev/guide/
- https://zod.dev/
- https://react.dev/reference/react-dom/components/textarea
- https://testing-library.com/docs/react-testing-library/intro/
- https://testing-library.com/docs/user-event/intro/

## Patterns To Mirror

There are no existing application modules to mirror. Mirror the repository's rule and PRD patterns instead.

### Immutable Updates

Source: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/rules/common/coding-style.md:3`

```text
ALWAYS create new objects, NEVER mutate existing ones
```

Implementation implication: `analyzePlanningInput` must return a new result object and never mutate token arrays, extracted groups, or previous UI state.

### Schema-Based Validation

Source: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/rules/typescript/coding-style.md:178`

```text
Use Zod for schema-based validation and infer types from the schema
```

Implementation implication: define `planningInputSchema`, `planningAnalysisSchema`, and exported inferred types in `src/features/planning/planningSchema.ts`.

### Phase 1 Scope

Source: `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md:255`

```text
Build MVP text input.
Define minimum information rules.
Extract personas, entities, actions, and states into structured JSON.
Show guidance when input is too vague.
```

Implementation implication: do not implement suggestions, Mermaid generation, render validation, or export in Phase 1.

## Files To Change

Create:

- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/package.json`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/package-lock.json` or chosen package-manager lockfile
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/index.html`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/tsconfig.json`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/tsconfig.node.json`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/vite.config.ts`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/main.tsx`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/App.tsx`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/App.test.tsx`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/test/setup.ts`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningSchema.ts`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningAnalyzer.ts`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/planningAnalyzer.test.ts`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/PlanningWorkspace.tsx`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/PlanningWorkspace.test.tsx`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/components/InputPanel.tsx`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/features/planning/components/AnalysisPanel.tsx`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/src/styles.css`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.gitignore`

Modify:

- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/.codex/PRPs/prds/ai-user-flow-planner.prd.md`
  - Already updated to mark Phase 1 as `in-progress` and link this plan.

Optional if implementation chooses Playwright E2E in Phase 1:

- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/playwright.config.ts`
- `/Users/yeomjaeheon/Documents/dev/ai-user-flow/e2e/planning-workspace.spec.ts`

## NOT Building

- No LLM API integration.
- No login, account, workspace, billing, or persistence.
- No edge-case suggestion acceptance workflow. That starts in Phase 2.
- No contradiction detector. That starts in Phase 2.
- No Mermaid code generation, rendering, self-correction, or export. That starts in Phase 3 and Phase 4.
- No general canvas editor.

## Step-By-Step Tasks

### Task 1: Bootstrap The App Shell

- ACTION: Create a React + TypeScript + Vite project in the repository root without overwriting `.codex`, `.agents`, `AGENTS.md`, or `graphify-out`.
- IMPLEMENT: Add `package.json`, Vite config, TypeScript configs, `index.html`, `src/main.tsx`, `src/App.tsx`, and `src/styles.css`.
- MIRROR: Follow Vite's `react-ts` template shape, but keep the product UI in feature folders instead of default demo components.
- IMPORTS: `@vitejs/plugin-react`, `typescript`, `vite`, `react`, `react-dom`.
- GOTCHA: Check Node version first because current Vite docs require Node `20.19+` or `22.12+`.
- VALIDATE: `npm run build` should compile after the empty shell is created.

### Task 2: Add Test Infrastructure First

- ACTION: Configure Vitest and React Testing Library before business logic.
- IMPLEMENT: Add `test`, `test:run`, and `coverage` scripts. Configure `test.environment = 'jsdom'` and `setupFiles = './src/test/setup.ts'` in `vite.config.ts`.
- MIRROR: Follow `.codex/rules/common/testing.md:10` by writing tests before implementation for Phase 1 behavior.
- IMPORTS: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`.
- GOTCHA: React Testing Library is not a test runner; Vitest provides `test`, `expect`, and coverage execution.
- VALIDATE: Add one smoke test for `App` and run `npm run test:run`.

### Task 3: Define Planning Schemas

- ACTION: Define typed planning input and analysis contracts.
- IMPLEMENT: In `planningSchema.ts`, create:
  - `planningInputSchema` with `rawText: z.string()`.
  - `planningCompletenessSchema` with `isSufficient`, `score`, `missingFields`, and `guidance`.
  - `planningAnalysisSchema` with `personas`, `entities`, `actions`, `states`, `assumptions`, `completeness`.
  - Inferred exported types for each schema.
- MIRROR: Use Zod as required by `.codex/rules/typescript/coding-style.md:178`.
- IMPORTS: `z` from `zod`.
- GOTCHA: Enable `strict` mode in `tsconfig.json`; Zod docs require this for supported TypeScript usage.
- VALIDATE: Typecheck should fail if an analysis result omits required fields.

### Task 4: Write Analyzer Unit Tests

- ACTION: Write tests for minimum information validation and deterministic extraction.
- IMPLEMENT: In `planningAnalyzer.test.ts`, cover:
  - Empty string returns insufficient result with missing `problem`, `user`, and `actions`.
  - Very short vague text returns insufficient result and guidance.
  - Input containing user, problem, and actions returns sufficient result.
  - Korean labels such as `주요 사용자`, `문제`, `핵심 기능`, `시나리오` are recognized.
  - Returned arrays are new values and not mutated across calls.
- MIRROR: Use AAA structure from `.codex/rules/common/testing.md:31`.
- IMPORTS: `describe`, `expect`, `test` from `vitest`; `analyzePlanningInput` from `planningAnalyzer`.
- GOTCHA: Keep Phase 1 deterministic. Do not call an LLM in unit tests.
- VALIDATE: The tests should fail before `planningAnalyzer.ts` is implemented.

### Task 5: Implement Deterministic Planning Analyzer

- ACTION: Implement `analyzePlanningInput(rawText)`.
- IMPLEMENT: Use simple, explainable heuristics:
  - Normalize whitespace.
  - Tokenize by line and sentence boundaries.
  - Detect personas from headings or phrases: `사용자`, `persona`, `customer`, `actor`, `founder`, `developer`, `PM`, `QA`.
  - Detect problem statements from `문제`, `pain`, `problem`, `해결`.
  - Detect actions from verbs and list items under `핵심 기능`, `시나리오`, `action`, `flow`.
  - Detect state candidates from status words such as `pending`, `success`, `fail`, `error`, `승인`, `거절`, `완료`, `실패`, `보류`.
  - Compute completeness from required dimensions: user, problem, actions.
  - Return guidance for missing dimensions.
- MIRROR: Respect `.codex/rules/common/coding-style.md:17` by keeping heuristics simple and named.
- IMPORTS: schema types from `planningSchema`.
- GOTCHA: Avoid overclaiming extraction quality. Add assumptions when heuristics infer weak candidates.
- VALIDATE: `npm run test:run -- planningAnalyzer`.

### Task 6: Build Planning Workspace UI Tests

- ACTION: Write component tests for the Phase 1 workflow.
- IMPLEMENT: In `PlanningWorkspace.test.tsx`, test:
  - The text area is discoverable by label.
  - Analyze button is disabled for empty input or shows guidance after submit.
  - Short vague input shows minimum information guidance.
  - Sufficient MVP text shows grouped personas/entities/actions/states.
- MIRROR: React Testing Library guidance: query by label, role, and visible text.
- IMPORTS: `render`, `screen`, `userEvent`, `PlanningWorkspace`.
- GOTCHA: The text area should stay controlled with `value` initialized to `''`.
- VALIDATE: Tests fail before UI implementation.

### Task 7: Implement Planning Workspace Components

- ACTION: Build the actual Phase 1 UI.
- IMPLEMENT:
  - `PlanningWorkspace.tsx` owns `rawText`, `analysis`, and submit state.
  - `InputPanel.tsx` renders a controlled `<textarea>`, character count, and submit button.
  - `AnalysisPanel.tsx` renders empty, guidance, or analysis states.
  - `App.tsx` renders `PlanningWorkspace`.
- MIRROR: Use named prop interfaces per `.codex/rules/typescript/coding-style.md:79`.
- IMPORTS: React hooks only where needed; `analyzePlanningInput`.
- GOTCHA: Do not nest cards inside cards. Use full-width bands or side-by-side tool panels.
- VALIDATE: `npm run test:run`, then use browser/dev server for visual sanity.

### Task 8: Style The MVP Workspace

- ACTION: Add restrained SaaS tool styling in `src/styles.css`.
- IMPLEMENT:
  - Responsive two-column layout on desktop, single-column on mobile.
  - Stable textarea and panel dimensions to avoid layout jumping.
  - Clear focus states and accessible color contrast.
  - Compact section headings and readable list groups.
- MIRROR: Follow frontend guidance from the active developer instructions: first screen is the usable app, not a landing page.
- IMPORTS: CSS only.
- GOTCHA: Avoid one-note palette, decorative orbs, oversized hero typography, and card-in-card layouts.
- VALIDATE: Run the app and inspect desktop and mobile widths.

### Task 9: Add Validation And Build Commands

- ACTION: Ensure standard scripts exist and all pass.
- IMPLEMENT: Scripts should include:
  - `dev`
  - `build`
  - `preview`
  - `test`
  - `test:run`
  - `coverage`
  - `typecheck`
- MIRROR: Vite docs default `dev`, `build`, and `preview`; Vitest docs default `test`.
- IMPORTS: None.
- GOTCHA: `vite build` typechecks only through configured pipeline if `tsc` is explicitly included. Prefer `tsc -b && vite build`.
- VALIDATE: Run `npm run typecheck`, `npm run test:run`, `npm run build`, and `npm run coverage`.

### Task 10: Final Repository Hygiene

- ACTION: Confirm generated files, graph state, and docs status.
- IMPLEMENT:
  - Add `.gitignore` for `node_modules`, `dist`, `coverage`, `.env*`, and Playwright artifacts if added.
  - Run `git status --short`.
  - Because code files will be modified, run `graphify update .` after implementation per `AGENTS.md:147`.
- MIRROR: Use `AGENTS.md:116` development workflow.
- IMPORTS: None.
- GOTCHA: Do not remove existing `.codex`, `.agents`, or `graphify-out` assets.
- VALIDATE: `git status --short` should show only intentional app, test, lockfile, plan, and PRD changes.

## Testing Strategy

- Unit tests:
  - `planningAnalyzer.test.ts` for completeness scoring, missing field guidance, Korean/English keyword recognition, and immutable outputs.
- Component tests:
  - `PlanningWorkspace.test.tsx` for input, submit, guidance, and rendered analysis states.
  - `App.test.tsx` smoke test to verify the app shell renders the workspace.
- Coverage:
  - Target at least 80% statements/branches/functions/lines for Phase 1 source.
- Manual validation:
  - Run the dev server and test these inputs:
    - Empty input.
    - `아이디어 앱`.
    - The PRD's MVP text excerpt containing users, problem, core features, and scenario.
- E2E:
  - Optional in Phase 1 because the PRD phase is local-only. Add Playwright only if the implementation scope includes browser journey coverage now.

## Validation Commands

Run in order:

```bash
node --version
npm install
npm run typecheck
npm run test:run
npm run coverage
npm run build
npm run dev
graphify update .
git status --short
```

If Playwright E2E is added:

```bash
npm run e2e
```

## Acceptance Criteria

- A user can run the app locally with `npm run dev`.
- A user can paste MVP notes into a labeled textarea and trigger analysis.
- Empty or vague input does not produce a false-positive analysis.
- Insufficient input shows concrete missing fields and guidance.
- Sufficient input produces structured personas, entities, actions, states, assumptions, and completeness result.
- Analyzer output is schema-validated and strongly typed.
- All public exported functions have explicit TypeScript return types.
- Unit/component tests pass.
- Build and typecheck pass.
- Coverage is at least 80% for Phase 1 code.
- PRD Phase 1 remains marked `in-progress` until implementation is complete.

## Risks And Notes

- There is no existing app architecture, so implementation must create first conventions. Keep them simple and feature-oriented under `src/features/planning`.
- Heuristic parsing can be imperfect. Phase 1 should label weak inferences as assumptions instead of pretending AI-grade understanding exists.
- The PRD has open questions about accounts, persistence, LLM provider, and backend validation. Phase 1 should avoid decisions that force those choices.
- Installing current Vite/Vitest may fail on older Node versions. Upgrade Node or pin compatible versions if local Node cannot meet current official requirements.
- Because Phase 1 creates code files, remember to run `graphify update .` after implementation.
