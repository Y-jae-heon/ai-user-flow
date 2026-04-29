# Graph Report - ai-user-flow  (2026-04-29)

## Corpus Check
- 52 files · ~53,872 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 238 nodes · 335 edges · 18 communities detected
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 21|Community 21]]

## God Nodes (most connected - your core abstractions)
1. `analyzePlanningInput()` - 15 edges
2. `createPassedReport()` - 11 edges
3. `createFailedReport()` - 9 edges
4. `createFallbackExtraction()` - 8 edges
5. `PlanningValidator` - 8 edges
6. `createMermaidDraft()` - 8 edges
7. `createSessionSnapshotFromInput()` - 7 edges
8. `safeParseWithMessages()` - 6 edges
9. `PlanningService` - 5 edges
10. `throwValidationError()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `createSessionSnapshotFromInput()` --calls--> `createPassedReport()`  [INFERRED]
  apps/backend/src/planning/planning.service.ts → apps/backend/src/planning/planning.validator.ts
- `createSnapshot()` --calls--> `createPassedReport()`  [INFERRED]
  apps/backend/src/planning/planning.extraction.service.spec.ts → apps/backend/src/planning/planning.validator.ts
- `createSufficientAnalysis()` --calls--> `analyzePlanningInput()`  [INFERRED]
  src/features/planning/mermaidGenerator.test.ts → src/features/planning/planningAnalyzer.ts
- `createAnalysis()` --calls--> `analyzePlanningInput()`  [INFERRED]
  src/features/planning/planningContracts.test.ts → src/features/planning/planningAnalyzer.ts
- `bootstrap()` --calls--> `getAppConfig()`  [INFERRED]
  apps/backend/src/main.ts → apps/backend/src/config/app.config.ts

## Hyperedges (group relationships)
- **Graphify Navigation Tools** — agents_graphify_query, agents_graphify_path, agents_graphify_explain, agents_extracted_and_inferred_edges [EXTRACTED 1.00]
- **Graph-First Codebase Question Workflow** — agents_graph_report, agents_graphify_wiki_index, agents_cross_module_relationship_questions, agents_graphify_knowledge_graph [INFERRED 0.86]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.15
Nodes (16): createSufficientAnalysis(), analyzePlanningInput(), buildAssumptions(), calculateScore(), detectContradictions(), extractActions(), extractByKeywords(), extractEntities() (+8 more)

### Community 1 - "Community 1"
Cohesion: 0.2
Nodes (10): createSnapshot(), createFailedReport(), createPassedReport(), getFlowDraftShapeErrors(), hasCycle(), isSafeLabel(), mergeStatus(), PlanningValidator (+2 more)

### Community 2 - "Community 2"
Cohesion: 0.19
Nodes (10): HealthController, calculateCompleteness(), createMermaidValidationDocument(), createSessionSnapshot(), createSessionSnapshotFromInput(), normalizePlanningInput(), PlanningService, throwValidationError() (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.18
Nodes (11): calculateFallbackCompleteness(), createDependencyAnalysis(), createFallbackExtraction(), detectContradictions(), extractValues(), getCompleteness(), getSnapshotStatus(), normalizeText() (+3 more)

### Community 4 - "Community 4"
Cohesion: 0.17
Nodes (16): AST-Only No API Cost Update, Code Modification Session, Cross-Module Relationship Questions, EXTRACTED and INFERRED Edges, God Nodes and Community Structure, GRAPH_REPORT.md, graphify explain, Graphify Knowledge Graph (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.27
Nodes (13): buildExceptionEdges(), buildExceptionNodes(), buildListEdges(), buildListNodes(), createBlockedDocument(), createEdge(), createMermaidDraft(), createNode() (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.27
Nodes (11): addSortIndicators(), enableUI(), getNthColumn(), getTable(), getTableBody(), getTableHeader(), loadColumns(), loadData() (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.35
Nodes (8): a(), B(), D(), g(), i(), k(), Q(), y()

### Community 8 - "Community 8"
Cohesion: 0.27
Nodes (8): defaultCodeForStatus(), HttpExceptionFilter, normalizeHttpExceptionBody(), createFailureEnvelope(), createPlanningSessionSnapshot(), getSessionStatus(), normalizeElements(), normalizePlanningSessionInput()

### Community 9 - "Community 9"
Cohesion: 0.31
Nodes (3): createOfficialMermaidParserAdapter(), isParserRuntimeCompatibilityError(), MermaidSyntaxService

### Community 10 - "Community 10"
Cohesion: 0.39
Nodes (5): canvasToBlob(), downloadBlob(), exportSvg(), exportSvgToPng(), loadSvgImage()

### Community 11 - "Community 11"
Cohesion: 0.43
Nodes (6): correctMermaidSyntax(), createRenderedDocument(), ensureMermaidInitialized(), getErrorMessage(), renderMermaidDocument(), renderOnce()

### Community 12 - "Community 12"
Cohesion: 0.47
Nodes (4): getAppConfig(), parsePort(), parsePositiveInteger(), bootstrap()

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (2): OpenAIPlanningAiClient, PlanningAiClientUnavailableError

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (1): PlanningController

### Community 15 - "Community 15"
Cohesion: 0.7
Nodes (4): goToNext(), goToPrevious(), makeCurrent(), toggleClass()

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (1): AppModule

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (1): PlanningModule

## Knowledge Gaps
- **7 isolated node(s):** `AppModule`, `PlanningModule`, `God Nodes and Community Structure`, `Raw Files`, `Code Modification Session` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 13`** (6 nodes): `planning.ai-client.ts`, `OpenAIPlanningAiClient`, `.constructor()`, `.extractPlanningLogic()`, `PlanningAiClientUnavailableError`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (6 nodes): `planning.controller.ts`, `PlanningController`, `.analyzePlanningSession()`, `.constructor()`, `.createPlanningSession()`, `.validateMermaid()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (2 nodes): `AppModule`, `app.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (2 nodes): `planning.module.ts`, `PlanningModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createPassedReport()` connect `Community 1` to `Community 9`, `Community 2`, `Community 3`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `getErrorMessage()` connect `Community 11` to `Community 8`, `Community 9`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `createSuccessEnvelope()` connect `Community 2` to `Community 8`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `analyzePlanningInput()` (e.g. with `createSufficientAnalysis()` and `createAnalysis()`) actually correct?**
  _`analyzePlanningInput()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `createPassedReport()` (e.g. with `.validateMermaid()` and `createSessionSnapshotFromInput()`) actually correct?**
  _`createPassedReport()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `AppModule`, `PlanningModule`, `God Nodes and Community Structure` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._