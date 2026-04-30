# Planning API Contract

This file documents the active backend contract surface for the planning feature. Zod schemas in `planningSchema.ts` remain the frontend source of truth, and the NestJS backend mirrors these DTOs at the API boundary.

## Runtime Configuration

The frontend calls `VITE_PLANNING_API_BASE_URL` when it is set. If the variable is omitted, the API client defaults to:

```text
http://localhost:3001
```

For local development, run the frontend on `http://localhost:5173` and configure the backend `FRONTEND_ORIGIN` to match if the origin differs.

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

| Endpoint | Primary schema |
|---|---|
| `POST /api/planning-sessions` | `planningInputSchema`, `planningSessionResponseSchema` |
| `GET /api/planning-sessions/{sessionId}` | `planningSessionResponseSchema` |
| `POST /api/planning-sessions/{sessionId}/analyze` | `planningSessionResponseSchema` |
| `POST /api/planning-sessions/{sessionId}/mermaid` | `mermaidGenerationResponseSchema` |
| `POST /api/planning-sessions/{sessionId}/mermaid/validate` | `mermaidValidationResponseSchema` |

`POST /api/planning-sessions/{sessionId}/mermaid` returns the full updated `PlanningSessionSnapshot`, including `flowDraft`, `mermaidDocument`, and `validation`. It does not return only the nested generation payload.

Backend Mermaid validation returns safe Mermaid code and validation status, but not rendered SVG. The browser still renders `mermaidDocument.code` for preview, SVG export, and PNG export.

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

## Frontend Integration

The React workspace creates a session, analyzes it, and generates Mermaid through the backend API. Suggestion review status is sent by embedding the updated suggestions in the session snapshot passed to the generation endpoint. Node label refinement remains local until a backend node-refinement endpoint exists.
