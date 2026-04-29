# Backend Orchestration AI Extraction Workflow Local Review

## Findings

### HIGH - Fallback extraction can throw on valid long planning fields

File: `apps/backend/src/planning/planning.extraction.service.ts`

`createFallbackExtraction()` copies `policyConstraint` and `exceptionCase` directly into schema-constrained `safeTextSchema` fields. Those request fields are accepted by `planningInputSchema` with no max length, but fallback output is parsed with `planningExtractionResultSchema`, where text fields are capped at 240 characters. If OpenAI is unavailable and either field is longer than 240 characters, the fallback parse throws instead of returning the intended fallback snapshot. This turns a valid analyze request into a 500-class failure on the exact resilience path this code is meant to protect.

Recommendation: clamp or normalize every user-derived fallback field before building `businessRules`, `exceptionPaths`, and other `safeTextSchema` outputs. Add a unit or E2E test where AI extraction fails and `exceptionCase`/`policyConstraint` exceeds 240 characters.

### MEDIUM - Production audit still fails on introduced LangGraph transitive dependency

File: `apps/backend/package.json`

Adding `@langchain/langgraph` introduces four moderate `uuid <14.0.0` advisories through nested LangGraph packages. `npm audit --workspace @ai-user-flow/backend --omit=dev` exits non-zero. The suggested `npm audit fix --force` is a breaking downgrade, so this needs either a documented acceptance with CI policy alignment, a safe override/resolution, or an upstream version update when available.

Status after follow-up: explicitly accepted in `.codex/PRPs/reports/backend-orchestration-ai-extraction-workflow-report.md` under "Audit Risk Acceptance"; keep CI aligned with that temporary exception until a safe LangGraph update is available.

## Validation

Passed:

```bash
npm --workspace @ai-user-flow/backend run typecheck
npm --workspace @ai-user-flow/backend run test
npm --workspace @ai-user-flow/backend run test:e2e
npm --workspace @ai-user-flow/backend run build
npm run typecheck
git diff --check
```

Failed:

```bash
npm audit --workspace @ai-user-flow/backend --omit=dev
```

Failure: 4 moderate `uuid <14.0.0` advisories through `@langchain/langgraph`, `@langchain/langgraph-checkpoint`, and `@langchain/langgraph-sdk`.
