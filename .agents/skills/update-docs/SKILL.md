---
name: update-docs
description: Use when the user asks for /update-docs, documentation sync, generated docs, CONTRIBUTING updates, RUNBOOK updates, environment docs, or command reference updates. Generate documentation from source-of-truth files while preserving manual sections.
---

# Update Docs

Synchronize documentation from source-of-truth files. Do not invent generated content when the source is absent.

## Workflow

1. Identify sources of truth:
   - scripts from `package.json`, `Makefile`, `Cargo.toml`, `pyproject.toml`
   - environment variables from `.env.example`, `.env.template`, or `.env.sample`
   - API references from `openapi.yaml` or route files
   - public APIs from exports/source code
   - infrastructure from Docker or compose files
2. Generate or update command/script reference tables.
3. Generate or update environment variable documentation.
4. Update `docs/CONTRIBUTING.md` when requested or clearly applicable.
5. Update `docs/RUNBOOK.md` when deployment/runtime operations are in scope.
6. Flag docs that appear stale instead of rewriting them blindly.
7. Preserve manual prose and update only marked generated sections.

## Rules

- Use `<!-- AUTO-GENERATED -->` markers around generated sections.
- Preserve hand-written sections outside markers.
- Do not create new docs unless the request or workflow requires them.
- In the final summary, list updated, flagged, and skipped docs.
