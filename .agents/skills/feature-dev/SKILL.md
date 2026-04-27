---
name: feature-dev
description: Use when the user asks for /feature-dev or guided feature development. Explore the codebase, clarify scope, design the architecture, implement with tests, run validation after changes, and perform code/design review gates before summarizing.
---

# Feature Development

Use a structured path from request to verified implementation.

## Phases

1. Discovery
   - Identify requirements, constraints, acceptance criteria, and ambiguity.
   - Estimate task count. If more than 10 tasks, split into batches and write `.claude/plans/<feature-name>-plan.md` with batch status.

2. Codebase Exploration
   - Read relevant files and trace execution paths.
   - For architecture or cross-module questions, use graphify guidance from `AGENTS.md`.
   - Identify integration points and local conventions.

3. Clarification
   - Ask only targeted questions that materially affect implementation.
   - If reasonable assumptions are safe, state them and proceed.

4. Architecture
   - Define the implementation blueprint, files to change, validation commands, and risks.
   - For large or risky work, pause for approval before editing.

5. Implementation
   - Prefer TDD for behavioral changes.
   - Keep changes scoped and consistent with existing patterns.
   - After changing `.ts`, `.tsx`, Python backend, or similar typed files, run the relevant typecheck before moving on.

6. Quality Review
   - Run code-review checks.
   - If `.tsx` or `.css` changed, run design review before finalizing.
   - Fix CRITICAL/HIGH issues and rerun the relevant gate.

7. Summary
   - Summarize what changed, validation evidence, limitations, and next batch if any.
