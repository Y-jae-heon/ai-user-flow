---
name: prp-prd
description: Use when the user asks for /prp-prd, PRD creation, product requirements, or a problem-first product spec. Interactively produce a hypothesis-driven PRD with evidence, scope boundaries, success metrics, technical feasibility, and implementation phases.
---

# PRP PRD

Create a problem-first, hypothesis-driven PRD. Ask questions before inventing requirements. If evidence is missing, mark it as an assumption or TBD.

## Workflow

1. Initiate
   - If no idea is provided, ask what the user wants to build.
   - If input exists, restate it and confirm or proceed when clear.
2. Foundation
   - Identify who has the problem, what pain exists, why current alternatives fail, why now, and how success is measured.
3. Grounding
   - Research market or comparable products when relevant.
   - Explore the codebase for existing related functionality and constraints.
4. Deep Dive
   - Clarify vision, primary user, job-to-be-done, non-users, and constraints.
5. Technical Feasibility
   - Map stack impact, integration points, data model, UI impact, and risks.
6. Decisions
   - Define MVP, must-have vs nice-to-have, key hypothesis, out-of-scope, and open questions.
7. Generate
   - Write `.codex/PRPs/prds/<kebab-name>.prd.md`.

## PRD Sections

Include:

- Problem Statement
- Evidence
- Proposed Solution
- Key Hypothesis
- What We Are NOT Building
- Success Metrics
- Open Questions
- Users & Context
- Solution Detail with MoSCoW priorities
- Technical Approach
- Implementation Phases with `pending | in-progress | complete`
- Decisions Log
- Research Summary

After creation, tell the user to run `Use $prp-plan with <prd-path>` for the next pending phase.
