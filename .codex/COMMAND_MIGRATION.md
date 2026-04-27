# Claude Commands Converted For Codex

Codex does not use Claude-style project slash command files as the primary extension surface. The converted equivalents live as local Codex skills under `.agents/skills/` and can be invoked by naming the skill, for example `Use $prp-plan ...` or `Use $code-review-workflow`.

| Claude command | Codex skill |
|---|---|
| `/c:plan`, `/plan` | `$plan-workflow` |
| `/code-review` | `$code-review-workflow` |
| `/build-fix` | `$build-fix` |
| `/feature-dev` | `$feature-dev` |
| `/design-review` | `$design-review` |
| `/e2e` | `$e2e-testing` |
| `/glass-refine` | `$glass-refine` |
| `/tdd` | `$tdd-workflow` |
| `/prp-prd` | `$prp-prd` |
| `/prp-plan` | `$prp-plan` |
| `/prp-implement` | `$prp-implement` |
| `/save-session` | `$save-session` |
| `/update-docs` | `$update-docs` |

Legacy PRP artifact paths remain under `.claude/PRPs/` so existing plans, reports, and reviews continue to work.

## Source Notes

Two legacy command files are corrupted in-place and were not used as the only source of truth:

- `.claude/commands/e2e.md` starts in the middle of a Playwright example around line 24 and contains leftover code-fence fragments.
- `.claude/commands/tdd.md` starts its example around Step 3 and contains leftover `})` / closing code-fence fragments near line 24.

The Codex skills for `$e2e-testing` and `$tdd-workflow` were supplemented from:

- `.claude/agents/e2e-runner.md`
- `.claude/agents/tdd-guide.md`

## Legacy Agent Mapping

Claude project agents were converted into Codex skills rather than standalone agent files because Codex uses skills as the reusable project workflow surface. When actual parallel subagent execution is needed, Codex can still use its built-in agents explicitly, but these workflows should not depend on a local `planner` agent existing.

| Claude agent | Codex surface |
|---|---|
| `planner` | `$plan-workflow` for quick plans, `$prp-plan` for artifact plans |
| `code-architect` | `$feature-dev` architecture phase and `$prp-plan` design sections |
| `code-explorer` | `$feature-dev` exploration phase and `$prp-plan` exploration sections |
| `code-reviewer` | `$code-review-workflow` |
| `design-reviewer` | `$design-review` |
| `e2e-runner` | `$e2e-testing` |
| `tdd-guide` | `$tdd-workflow` |
