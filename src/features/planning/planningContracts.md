# Planning API Contract

This file documents the Phase 1 backend contract surface for the planning feature. Zod schemas in `planningSchema.ts` remain the source of truth.

## Input

`planningInputSchema` accepts the current local MVP payload:

```json
{
  "rawText": "사용자: PM\n문제: 재작업\n기능: 분석한다."
}
```

It also accepts optional planning elements for future API calls:

- `mvpDefinition`
- `targetUser`
- `problem`
- `coreScenario`
- `successResult`
- `dataDependency`
- `exceptionCase`
- `policyConstraint`
- `exportNeed`

Unknown element keys are rejected at the schema boundary.

## Session Snapshot

`planningSessionSnapshotSchema` is the transport DTO for `GET /api/planning-sessions/{sessionId}` and session creation responses. It can hold:

- normalized `input`
- current `analysis`
- `dependencyAnalysis`
- mapped `entities`
- optional `stateMachine`
- optional `validation`
- optional `flowDraft`
- optional `mermaidDocument`

The local helper `createPlanningSessionSnapshot` maps current analysis state to these transport statuses:

- `input_received`
- `needs_clarification`
- `ready_for_generation`

## Endpoint Mapping

| Future endpoint | Primary schema |
|---|---|
| `POST /api/planning-sessions` | `planningInputSchema`, `planningSessionResponseSchema` |
| `GET /api/planning-sessions/{sessionId}` | `planningSessionResponseSchema` |
| `POST /api/planning-sessions/{sessionId}/analyze` | `planningAnalysisResponseSchema` |
| `POST /api/planning-sessions/{sessionId}/mermaid` | `mermaidGenerationResponseSchema` |
| `POST /api/planning-sessions/{sessionId}/mermaid/validate` | `mermaidDocumentSchema`, `planningValidationReportSchema` |

## Response Envelope

Success responses use:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

Failure responses use:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Planning input could not be validated.",
    "retryable": true
  }
}
```

## Local-Only For Now

Phase 1 does not add a server, network client, LangGraph workflow, Redis, persistence, or API routing. The existing React workspace continues to call local analyzer and Mermaid utilities directly.
