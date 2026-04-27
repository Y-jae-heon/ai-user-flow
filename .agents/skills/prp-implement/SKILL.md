---
name: prp-implement
description: Use when the user asks for /prp-implement or to execute a PRP plan file. Load the plan, prepare the branch, implement tasks sequentially, validate after each change, write a report, update PRD status, and archive completed plans.
---

# PRP Implement

Execute a plan file with validation loops. Do not accumulate broken state.

## Workflow

1. Detect project commands
   - Determine package manager or runtime from lockfiles and config.
   - Identify available typecheck, lint, test, and build commands.
2. Load the plan
   - Read the given `.plan.md`.
   - Extract summary, patterns, files to change, tasks, validation commands, and acceptance criteria.
   - If invalid or missing, ask the user to run `prp-plan` first.
3. Prepare
   - Check branch and working tree with `git branch --show-current` and `git status --porcelain`.
   - If on main with dirty changes, stop and ask before proceeding.
   - Pull/rebase only when appropriate and non-destructive.
4. Execute tasks sequentially
   - Read each task's MIRROR references before editing.
   - Implement the smallest change that satisfies the task.
   - After every meaningful file change, run the relevant typecheck or targeted validation.
   - Log deviations from the plan with WHAT and WHY.
5. Validate
   - Run static analysis, lint, targeted tests, build, integration checks, and edge-case checks specified by the plan.
   - Fix failures before moving to the next level.
6. Report
   - Write `.codex/PRPs/reports/<plan-name>-report.md`.
   - Include tasks completed, validation results, files changed, deviations, issues, and tests written.
   - If tied to a PRD, mark the phase complete and link the report.
   - Move the plan to `.codex/PRPs/plans/completed/`.
7. Output
   - Summarize validation, files changed, deviations, artifacts, and next step.

If `.tsx` or `.css` changed, run `design-review` before `code-review-workflow`.
