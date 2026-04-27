---
name: code-review-workflow
description: Use when the user asks for /code-review, code review, PR review, review uncommitted changes, or review a GitHub PR. Review local diffs or PRs with a bug-first stance, run applicable validation, emit findings with severity and line references, and create PRP review artifacts when relevant.
---

# Code Review Workflow

Review as a senior engineer. Findings come first, ordered by severity. Focus on correctness, security, regressions, missing tests, maintainability, and validation failures.

## Mode Selection

- If the user provides a PR number, PR URL, branch name, or `--pr`, use PR review mode.
- Otherwise review local uncommitted changes.

## Local Review

1. Run `git diff --name-only HEAD`. If empty, report "Nothing to review."
2. Read each changed file in full, not only diff hunks.
3. Check:
   - Security: secrets, injection, XSS, auth gaps, path traversal, unsafe input handling.
   - Correctness: edge cases, null handling, race conditions, data loss, broken contracts.
   - Quality: overly large functions/files, deep nesting, unclear errors, debug logs, TODO/FIXME.
   - Tests: missing or weak coverage for changed behavior.
4. Run applicable validation based on project files:
   - Node: typecheck, lint, tests, build when scripts exist.
   - Python: `pytest` and configured type/lint tools when present.
   - Go/Rust/etc.: standard test/build/lint commands when present.
5. Report findings. Block merge/commit on CRITICAL or HIGH issues.

## PR Review

1. Use `gh pr view` and `gh pr diff` to gather metadata and changed files.
2. Read project rules, relevant PRP plans/reports, PR description, and full files at the PR head.
3. Apply the same checklist as local review.
4. Save an artifact to `.codex/PRPs/reviews/pr-<number>-review.md`.
5. Publish with `gh pr review` only when the user asked to post the review or the request clearly implies GitHub publishing.

## Severity

- CRITICAL: security vulnerability or data-loss risk.
- HIGH: likely user-visible bug or serious regression.
- MEDIUM: maintainability, missing tests, performance risk, or best-practice gap.
- LOW: small cleanup or style suggestion.

In Codex desktop reviews, use `::code-comment{...}` for inline findings when possible.
