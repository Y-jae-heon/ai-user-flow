---
name: build-fix
description: Use when the user asks for /build-fix, build fix, type error cleanup, compile error repair, or to make the project build again. Detect the build system, run the relevant build/type command, group errors, and fix incrementally with minimal diffs.
---

# Build Fix

Fix build, compile, and type errors one small step at a time.

## Workflow

1. Detect the build system:
   - `package.json`: use package manager from lockfile and run `build`, `typecheck`, or `tsc --noEmit`.
   - `pyproject.toml`: run configured checks, `pytest`, `mypy`, or `python -m compileall -q .` as applicable.
   - `Cargo.toml`: `cargo build`.
   - `go.mod`: `go build ./...`.
   - JVM projects: Maven or Gradle compile tasks.
2. Capture errors and group by file.
3. Fix dependency-order issues first: syntax/import/type definitions before logic.
4. For each error:
   - Read the file context.
   - Diagnose the root cause.
   - Make the smallest defensible change.
   - Re-run the failing command.
5. Stop and ask the user if:
   - The fix requires architecture changes.
   - The same error persists after three attempts.
   - A fix introduces more errors than it resolves.
   - Missing dependencies require install decisions.

## Final Report

List fixed files, commands run, remaining errors, and any recommended next step.
