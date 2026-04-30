# Graph Report - ai-user-flow  (2026-04-30)

## Corpus Check
- 67 files · ~62,816 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 368 nodes · 587 edges · 22 communities detected
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 90 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 26|Community 26]]

## God Nodes (most connected - your core abstractions)
1. `createPassedReport()` - 19 edges
2. `analyzePlanningInput()` - 15 edges
3. `PlanningService` - 14 edges
4. `InMemoryPlanningPersistence` - 13 edges
5. `RedisPlanningPersistence` - 13 edges
6. `safeParseWithMessages()` - 11 edges
7. `createSuccessEnvelope()` - 11 edges
8. `getIdempotencyKey()` - 9 edges
9. `createMermaidDraft()` - 9 edges
10. `createFallbackExtraction()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `bootstrap()` --calls--> `getAppConfig()`  [INFERRED]
  apps/backend/src/main.ts → apps/backend/src/config/app.config.ts
- `createSessionSnapshotFromInput()` --calls--> `createPassedReport()`  [INFERRED]
  apps/backend/src/planning/planning.service.ts → apps/backend/src/planning/planning.validator.ts
- `createSnapshot()` --calls--> `createPassedReport()`  [INFERRED]
  apps/backend/src/planning/planning.state-machine.service.spec.ts → apps/backend/src/planning/planning.validator.ts
- `createSnapshot()` --calls--> `createPassedReport()`  [INFERRED]
  apps/backend/src/planning/planning.persistence.spec.ts → apps/backend/src/planning/planning.validator.ts
- `createSnapshot()` --calls--> `createPassedReport()`  [INFERRED]
  apps/backend/src/planning/planning.mermaid-generator.service.spec.ts → apps/backend/src/planning/planning.validator.ts

## Hyperedges (group relationships)
- **Graphify Navigation Tools** — agents_graphify_query, agents_graphify_path, agents_graphify_explain, agents_extracted_and_inferred_edges [EXTRACTED 1.00]
- **Graph-First Codebase Question Workflow** — agents_graph_report, agents_graphify_wiki_index, agents_cross_module_relationship_questions, agents_graphify_knowledge_graph [INFERRED 0.86]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (13): createScope(), hashRequestBody(), normalizeIdempotencyKey(), PlanningIdempotencyService, stableStringify(), addSeconds(), getIdempotencyKey(), getRetryKey() (+5 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (13): HealthController, PlanningRetryCounterService, calculateCompleteness(), createMermaidValidationDocument(), createSessionSnapshot(), createSessionSnapshotFromInput(), getGenerationSnapshotStatus(), normalizePlanningInput() (+5 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (14): createSnapshot(), createSnapshot(), createSnapshot(), createReadySnapshot(), createSnapshot(), createFailedReport(), createPassedReport(), getFlowDraftShapeErrors() (+6 more)

### Community 3 - "Community 3"
Cohesion: 0.16
Nodes (21): buildListEdges(), buildListNodes(), buildRecoveryEdges(), buildRecoveryNodes(), createBlockedDocument(), createEdge(), createFallbackDocument(), createGeneratedDocument() (+13 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (16): createSufficientAnalysis(), analyzePlanningInput(), buildAssumptions(), calculateScore(), detectContradictions(), extractActions(), extractByKeywords(), extractEntities() (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.18
Nodes (13): calculateFallbackCompleteness(), cleanLabel(), createDependencyAnalysis(), createFallbackExtraction(), detectContradictions(), extractValues(), getCompleteness(), getSnapshotStatus() (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.18
Nodes (9): createOfficialMermaidParserAdapter(), isParserRuntimeCompatibilityError(), MermaidSyntaxService, correctMermaidSyntax(), createRenderedDocument(), ensureMermaidInitialized(), getErrorMessage(), renderMermaidDocument() (+1 more)

### Community 7 - "Community 7"
Cohesion: 0.17
Nodes (16): AST-Only No API Cost Update, Code Modification Session, Cross-Module Relationship Questions, EXTRACTED and INFERRED Edges, God Nodes and Community Structure, GRAPH_REPORT.md, graphify explain, Graphify Knowledge Graph (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.24
Nodes (13): analyzePlanningSession(), createIdempotencyKey(), createPlanningSession(), generatePlanningMermaid(), getPlanningApiBaseUrl(), isAbortError(), parseJsonResponse(), parseMermaidGenerationRequest() (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.27
Nodes (13): buildExceptionEdges(), buildExceptionNodes(), buildListEdges(), buildListNodes(), createBlockedDocument(), createEdge(), createMermaidDraft(), createNode() (+5 more)

### Community 10 - "Community 10"
Cohesion: 0.27
Nodes (11): addSortIndicators(), enableUI(), getNthColumn(), getTable(), getTableBody(), getTableHeader(), loadColumns(), loadData() (+3 more)

### Community 11 - "Community 11"
Cohesion: 0.27
Nodes (8): defaultCodeForStatus(), HttpExceptionFilter, normalizeHttpExceptionBody(), createFailureEnvelope(), createPlanningSessionSnapshot(), getSessionStatus(), normalizeElements(), normalizePlanningSessionInput()

### Community 12 - "Community 12"
Cohesion: 0.35
Nodes (8): a(), B(), D(), g(), i(), k(), Q(), y()

### Community 13 - "Community 13"
Cohesion: 0.27
Nodes (4): PlanningAuditService, redactSummary(), redactValidation(), getAuditKey()

### Community 14 - "Community 14"
Cohesion: 0.25
Nodes (1): PlanningController

### Community 15 - "Community 15"
Cohesion: 0.39
Nodes (5): canvasToBlob(), downloadBlob(), exportSvg(), exportSvgToPng(), loadSvgImage()

### Community 16 - "Community 16"
Cohesion: 0.43
Nodes (5): getAppConfig(), parseOptionalUrl(), parsePort(), parsePositiveInteger(), bootstrap()

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (2): OpenAIPlanningAiClient, PlanningAiClientUnavailableError

### Community 18 - "Community 18"
Cohesion: 0.7
Nodes (4): goToNext(), goToPrevious(), makeCurrent(), toggleClass()

### Community 19 - "Community 19"
Cohesion: 0.4
Nodes (1): PlanningApiClientError

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (1): AppModule

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (1): PlanningModule

## Knowledge Gaps
- **7 isolated node(s):** `AppModule`, `PlanningModule`, `God Nodes and Community Structure`, `Raw Files`, `Code Modification Session` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 14`** (8 nodes): `planning.controller.ts`, `PlanningController`, `.analyzePlanningSession()`, `.constructor()`, `.createPlanningSession()`, `.generateMermaid()`, `.getPlanningSession()`, `.validateMermaid()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (6 nodes): `planning.ai-client.ts`, `OpenAIPlanningAiClient`, `.constructor()`, `.extractPlanningLogic()`, `PlanningAiClientUnavailableError`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (5 nodes): `PlanningApiClientError`, `.constructor()`, `resolveCopy()`, `setupPlanningApiMocks()`, `PlanningWorkspace.test.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (2 nodes): `AppModule`, `app.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (2 nodes): `planning.module.ts`, `PlanningModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createPassedReport()` connect `Community 2` to `Community 1`, `Community 3`, `Community 5`, `Community 6`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `getErrorMessage()` connect `Community 6` to `Community 11`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `createSuccessEnvelope()` connect `Community 1` to `Community 11`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `createPassedReport()` (e.g. with `.validateMermaidOnce()` and `createSessionSnapshotFromInput()`) actually correct?**
  _`createPassedReport()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `analyzePlanningInput()` (e.g. with `createSufficientAnalysis()` and `createAnalysis()`) actually correct?**
  _`analyzePlanningInput()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `AppModule`, `PlanningModule`, `God Nodes and Community Structure` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._