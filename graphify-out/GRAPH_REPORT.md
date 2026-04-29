# Graph Report - ai-user-flow  (2026-04-29)

## Corpus Check
- 24 files · ~41,512 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 119 nodes · 161 edges · 8 communities detected
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.82)
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

## God Nodes (most connected - your core abstractions)
1. `analyzePlanningInput()` - 14 edges
2. `createMermaidDraft()` - 8 edges
3. `g()` - 5 edges
4. `getNthColumn()` - 5 edges
5. `enableUI()` - 5 edges
6. `graphify query` - 5 edges
7. `makeCurrent()` - 4 edges
8. `Q()` - 4 edges
9. `D()` - 4 edges
10. `y()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `createSufficientAnalysis()` --calls--> `analyzePlanningInput()`  [INFERRED]
  src/features/planning/mermaidGenerator.test.ts → src/features/planning/planningAnalyzer.ts

## Hyperedges (group relationships)
- **Graphify Navigation Tools** — agents_graphify_query, agents_graphify_path, agents_graphify_explain, agents_extracted_and_inferred_edges [EXTRACTED 1.00]
- **Graph-First Codebase Question Workflow** — agents_graph_report, agents_graphify_wiki_index, agents_cross_module_relationship_questions, agents_graphify_knowledge_graph [INFERRED 0.86]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.17
Nodes (15): createSufficientAnalysis(), analyzePlanningInput(), buildAssumptions(), calculateScore(), detectContradictions(), extractActions(), extractByKeywords(), extractEntities() (+7 more)

### Community 1 - "Community 1"
Cohesion: 0.17
Nodes (16): AST-Only No API Cost Update, Code Modification Session, Cross-Module Relationship Questions, EXTRACTED and INFERRED Edges, God Nodes and Community Structure, GRAPH_REPORT.md, graphify explain, Graphify Knowledge Graph (+8 more)

### Community 2 - "Community 2"
Cohesion: 0.27
Nodes (13): buildExceptionEdges(), buildExceptionNodes(), buildListEdges(), buildListNodes(), createBlockedDocument(), createEdge(), createMermaidDraft(), createNode() (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.27
Nodes (11): addSortIndicators(), enableUI(), getNthColumn(), getTable(), getTableBody(), getTableHeader(), loadColumns(), loadData() (+3 more)

### Community 4 - "Community 4"
Cohesion: 0.35
Nodes (8): a(), B(), D(), g(), i(), k(), Q(), y()

### Community 5 - "Community 5"
Cohesion: 0.39
Nodes (5): canvasToBlob(), downloadBlob(), exportSvg(), exportSvgToPng(), loadSvgImage()

### Community 6 - "Community 6"
Cohesion: 0.43
Nodes (6): correctMermaidSyntax(), createRenderedDocument(), ensureMermaidInitialized(), getErrorMessage(), renderMermaidDocument(), renderOnce()

### Community 7 - "Community 7"
Cohesion: 0.7
Nodes (4): goToNext(), goToPrevious(), makeCurrent(), toggleClass()

## Knowledge Gaps
- **5 isolated node(s):** `God Nodes and Community Structure`, `Raw Files`, `Code Modification Session`, `AST-Only No API Cost Update`, `Rationale: Keep Graph Current After Code Changes`
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `God Nodes and Community Structure`, `Raw Files`, `Code Modification Session` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._