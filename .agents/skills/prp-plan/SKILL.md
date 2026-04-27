---
name: prp-plan
description: Use when the user asks for /prp-plan, detailed implementation planning, plan from PRD, or a self-contained implementation plan. Analyze the codebase deeply, extract patterns, and save an executable PRP plan artifact.
---

# PRP Plan

Create a self-contained implementation plan that a developer can execute without further codebase searching.

## Workflow

1. Detect Input
   - PRD path: parse Implementation Phases and choose the next eligible pending phase.
   - Markdown reference: read it as context.
   - Free-form text: treat it as the feature description.
   - Empty input: ask what to plan.
2. Parse
   - Identify what, why, who, where, acceptance criteria, complexity, and ambiguity.
   - Stop for clarification if success criteria or deliverable is unclear.
3. Explore
   - Find similar implementations, naming, errors, logging, types, tests, config, dependencies.
   - Trace entry points, data flow, state changes, contracts, and architecture patterns.
   - In this repo, use graphify guidance from `AGENTS.md` for architecture/cross-module discovery.
4. Research
   - For external libraries or unstable APIs, use official docs and note version gotchas.
5. Design
   - Document UX before/after where relevant.
   - Define approach, alternatives, scope, and explicit non-goals.
6. Generate
   - If tasks exceed 10, split into 5-10 task batch plans.
   - Save to `.claude/PRPs/plans/<kebab-name>.plan.md`.
   - If generated from a PRD, update the phase to `in-progress` and link the plan.

## Required Plan Contents

- Summary and user story
- Metadata: complexity, source PRD, PRD phase, estimated files
- UX design or `N/A`
- Mandatory reading with file/line references
- External documentation findings
- Patterns to mirror with real source snippets
- Files to change
- NOT Building
- Step-by-step tasks with ACTION, IMPLEMENT, MIRROR, IMPORTS, GOTCHA, VALIDATE
- Testing strategy
- Validation commands
- Acceptance criteria
- Risks and notes

Before finalizing, verify that every task is actionable and source references point to real files.
