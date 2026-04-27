---
name: e2e-testing
description: Use when the user asks for /e2e, E2E tests, Playwright coverage, browser-flow testing, or verification of a critical user journey. Generate or update focused Playwright tests, run relevant tests, collect artifacts, and report failures or flake risks.
---

# E2E Testing

Create and run focused end-to-end coverage for real user flows.

## Project Defaults

Use Playwright as the primary E2E runner for this project.

| Item | Default |
|---|---|
| Web base URL | `http://localhost:5173`, override with `E2E_BASE_URL` |
| Backend | `http://localhost:3000`, usually requires `docker-compose up` first |
| Test directory | `apps/web/tests/e2e/` |
| Browser | Chromium unless config says otherwise |
| Locale/timezone | `ko-KR`, `Asia/Seoul` |
| Seed users | `alice@test.local` (ADMIN), `bob@test.local` (EMPLOYEE) |
| Seed data | `회의실-A` active room when booking flows are tested |

Common commands:

```bash
pnpm --filter web e2e
pnpm --filter web e2e tests/e2e/booking-happy.spec.ts
pnpm --filter web e2e --headed
pnpm --filter web e2e --debug
pnpm --filter web e2e --trace on
npx playwright show-report
```

## Workflow

1. Identify the critical user journey, required roles, data setup, and expected outcome.
2. Inspect existing Playwright configuration, test structure, fixtures, and Page Object patterns.
3. Add or update the smallest useful E2E test set. Prefer:
   - stable `data-testid` selectors
   - Page Object Model if already used
   - waiting for API responses or visible states rather than arbitrary sleeps
   - artifacts on failure through Playwright config
4. Run only the relevant tests unless the user asks for the full suite.
5. If tests fail, inspect screenshots/traces/logs, fix the root cause, and rerun.
6. Report pass/fail, command used, artifacts, flake risk, and next fixes.

## Creation Rules

- Use Page Object Model if existing tests use it.
- Prefer `data-testid` selectors, then semantic locators, then CSS as a last resort.
- Never use `waitForTimeout` as the primary synchronization strategy.
- Prefer `page.waitForResponse`, `expect(locator).toBeVisible`, and Playwright locator auto-waiting.
- Keep tests independent. Each test must set up or select its own data.
- Add assertions at key state transitions, not only at the final page.
- Capture or preserve screenshots, videos, traces, console logs, and network context on failure through the Playwright config.

## Priority Flows From Legacy Command

When this repo matches the enterprise management app context, prioritize:

- Login for ADMIN and EMPLOYEE users.
- Room booking happy path.
- Booking conflict handling.
- Project create/read/update.
- Employee dashboard view.
- Project version management.
- Room admin, API keys, and analytics export when relevant.

## Flaky Test Handling

Run high-risk tests repeatedly when stability is uncertain:

```bash
pnpm --filter web e2e tests/e2e/<flow>.spec.ts --repeat-each=10
```

If a test is flaky:

- Identify the common failure signature and likely race.
- Fix synchronization or selector stability first.
- Quarantine with `test.fixme()` or `test.skip()` only when the cause cannot be fixed in the current task.
- Report pass rate, failure message, and recommended follow-up.

## Fallback Browser Path

If Playwright cannot run in the environment, use the Codex in-app browser or available browser automation to manually verify the same flow. Record the fallback clearly, including screenshots or observations. Do not claim E2E coverage was added unless a committed Playwright test exists.

## Success Metrics

- Critical journeys pass.
- Overall suite pass rate is at least 95% when running broader coverage.
- Flaky rate stays below 5%.
- Relevant artifacts are available for failed tests.
- The final report includes commands run and exact pass/fail status.
