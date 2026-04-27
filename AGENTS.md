# AI User Flow Planner — AGENTS.md

## Project Overview

AI User Flow Planner는 불완전한 MVP/제품 기획 텍스트를 분석해 누락된 비즈니스 로직, 예외 경로, 상충 요구사항을 찾아내고, 개발·리뷰 가능한 Mermaid 사용자 흐름으로 변환하는 AI 플래닝 도구다.

핵심 PRD:

- `.codex/PRPs/prds/ai-user-flow-planner.prd.md`

## Current Repository Layout

```text
ai-user-flow/
├── AGENTS.md
├── .codex/
│   ├── config.toml
│   ├── hooks.json
│   ├── COMMAND_MIGRATION.md
│   ├── PRPs/
│   │   └── prds/
│   │       └── ai-user-flow-planner.prd.md
│   └── rules/
│       ├── README.md
│       ├── common/
│       ├── python/
│       └── typescript/
├── .agents/
│   └── skills/
│       ├── plan-workflow/
│       ├── prp-prd/
│       ├── prp-plan/
│       ├── prp-implement/
│       ├── tdd-workflow/
│       ├── code-review-workflow/
│       ├── design-review/
│       ├── e2e-testing/
│       └── ...
└── graphify-out/
    ├── GRAPH_REPORT.md
    ├── graph.json
    └── graph.html
```

## Rules

Rules live under `.codex/rules/`. Read the applicable rules before planning, implementing, reviewing, or committing.

### Common Rules

- `.codex/rules/common/coding-style.md` — immutability, KISS/DRY/YAGNI, file size, naming, error handling, input validation
- `.codex/rules/common/testing.md` — TDD, 80% coverage, unit/integration/E2E expectations, AAA pattern
- `.codex/rules/common/security.md` — secret management, input validation, injection/XSS/CSRF checks
- `.codex/rules/common/development-workflow.md` — research, planning, TDD, review, commit workflow
- `.codex/rules/common/git-workflow.md` — conventional commit format and PR expectations
- `.codex/rules/common/code-review.md` — review triggers, checklist, severity levels
- `.codex/rules/common/patterns.md` — repository/API response patterns and reusable implementation guidance
- `.codex/rules/common/performance.md` — performance and context-management guidance
- `.codex/rules/common/hooks.md` — hook concepts and automation guidance
- `.codex/rules/common/agents.md` — legacy agent orchestration guidance; map agent names to Codex skills using `.codex/COMMAND_MIGRATION.md`

### Language Rules

- TypeScript/JavaScript:
  - `.codex/rules/typescript/coding-style.md`
  - `.codex/rules/typescript/testing.md`
  - `.codex/rules/typescript/patterns.md`
  - `.codex/rules/typescript/security.md`
  - `.codex/rules/typescript/hooks.md`
- Python:
  - `.codex/rules/python/coding-style.md`
  - `.codex/rules/python/testing.md`
  - `.codex/rules/python/patterns.md`
  - `.codex/rules/python/security.md`
  - `.codex/rules/python/hooks.md`

## Codex Skills

Claude slash commands and agents were converted to Codex skills. See `.codex/COMMAND_MIGRATION.md` for the full mapping.

Use these surfaces:

| Workflow | Codex skill |
|---|---|
| Quick plan, former `/c:plan` | `$plan-workflow` |
| Deep PRD | `$prp-prd` |
| Deep implementation plan | `$prp-plan` |
| Execute plan | `$prp-implement` |
| Feature development | `$feature-dev` |
| TDD | `$tdd-workflow` |
| Code review | `$code-review-workflow` |
| Design review | `$design-review` |
| E2E testing | `$e2e-testing` |
| Build/type fix | `$build-fix` |
| Documentation sync | `$update-docs` |
| Session handoff | `$save-session` |

## Planning Workflow

Use the planning level that matches scope:

- Simple or conversational plan: use `$plan-workflow`.
- Deep product/spec work: use `$prp-prd`, then `$prp-plan`.
- Deep technical plan without a PRD: use `$prp-plan` directly.
- Implementation from a plan: use `$prp-implement`.

For planning, always include:

- requirements and assumptions
- affected files/modules when known
- architecture or data-flow impact
- risks and mitigation
- validation commands
- success criteria

## Development Workflow

Default flow:

1. Read applicable `.codex/rules`.
2. Check `graphify-out/GRAPH_REPORT.md` for architecture/codebase questions.
3. Plan with `$plan-workflow` or `$prp-plan`.
4. Implement with TDD via `$tdd-workflow` when behavior changes.
5. Run relevant typecheck/lint/test/build commands.
6. Run `$design-review` for UI changes.
7. Run `$code-review-workflow` before committing shared work.
8. Commit using `.codex/rules/common/git-workflow.md`.

## Security

- Never commit `.env` or secrets.
- Never hardcode API keys, tokens, database passwords, or provider credentials.
- Validate all user input at system boundaries.
- Use parameterized queries for database access.
- Do not save LLM output into persistent storage without schema validation.
- Do not use silent `except: pass` or equivalent swallowed error handling.

## Graphify

This project has a graphify knowledge graph at `graphify-out/`.

Rules:

- Before answering architecture or codebase questions, read `graphify-out/GRAPH_REPORT.md` for god nodes and community structure.
- If `graphify-out/wiki/index.md` exists, navigate it instead of reading raw files.
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep because these traverse EXTRACTED and INFERRED graph edges.
- After modifying code files in this session, run `graphify update .` to keep the graph current. Documentation-only changes do not require a graphify update.
