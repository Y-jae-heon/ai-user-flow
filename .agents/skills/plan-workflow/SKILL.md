---
name: plan-workflow
description: Use when the user asks for planning before implementation, says /c:plan or /plan, requests a step-by-step implementation plan, or the work is risky, ambiguous, architectural, or spans multiple files. Restate requirements, assess risk, produce an actionable plan, and wait for explicit confirmation before editing code.
---

# Plan Workflow

Create a plan that makes later implementation straightforward. Do not edit code while using this skill unless the user explicitly confirms the plan and asks to proceed.

## Workflow

1. Restate the request in concrete terms.
2. Identify assumptions, missing requirements, dependencies, and risks.
3. Inspect the relevant codebase context if needed. For architecture or cross-module questions in this repo, read `graphify-out/GRAPH_REPORT.md` first and prefer `graphify query`, `graphify path`, or `graphify explain` where useful.
4. Break implementation into phases with specific files or modules when known.
5. Include validation commands and acceptance criteria.
6. Ask for explicit confirmation before changing files.

## Planning Standard

Match the legacy Claude `planner` agent's level of detail:

- Analyze requirements completely and ask only clarifying questions that affect implementation.
- Review existing architecture before proposing changes.
- Identify affected components, similar implementations, and reusable patterns.
- Break work into dependency-ordered phases.
- Make each step incremental and verifiable.
- Prefer extending existing code over rewriting.
- Include edge cases, error paths, and testing strategy.
- Flag red risks: large functions, deep nesting, duplicated code, hardcoded values, missing tests, unclear file paths, or phases that cannot be delivered independently.

## Output Shape

Use this structure:

```markdown
# Implementation Plan: <name>

## Overview
- 2-3 sentence summary.

## Requirements
- ...

## Architecture Changes
- File/module: what changes and why.

## Assumptions / Questions
- ...

## Implementation Steps

### Phase 1: <name>
1. **<step>** (File: path/to/file)
   - Action: ...
   - Why: ...
   - Dependencies: None / step N
   - Risk: Low/Medium/High

### Phase 2: <name>
- ...

## Risks
- HIGH/MEDIUM/LOW: ...

## Testing Strategy
- Unit tests: ...
- Integration tests: ...
- E2E tests: ...

## Success Criteria
- [ ] ...

## Validation Commands
- ...

## Complexity
Small | Medium | Large | XL

Waiting for confirmation before editing code.
```

If the user asks for a deeper artifact-producing plan, use `prp-plan` instead.
