# Graph Report - ai-user-flow  (2026-04-27)

## Corpus Check
- 16 files · ~14,055 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 74 nodes · 97 edges · 6 communities detected
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]

## God Nodes (most connected - your core abstractions)
1. `analyzePlanningInput()` - 11 edges
2. `g()` - 5 edges
3. `getNthColumn()` - 5 edges
4. `enableUI()` - 5 edges
5. `graphify query` - 5 edges
6. `makeCurrent()` - 4 edges
7. `Q()` - 4 edges
8. `D()` - 4 edges
9. `y()` - 4 edges
10. `getTableHeader()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Cross-Module Relationship Questions` --rationale_for--> `Rationale: Prefer Graph Navigation Over Raw File Reading`  [INFERRED]
  AGENTS.md → AGENTS.md  _Bridges community 4 → community 3_

## Hyperedges (group relationships)
- **Graphify Navigation Tools** — agents_graphify_query, agents_graphify_path, agents_graphify_explain, agents_extracted_and_inferred_edges [EXTRACTED 1.00]
- **Graph-First Codebase Question Workflow** — agents_graph_report, agents_graphify_wiki_index, agents_cross_module_relationship_questions, agents_graphify_knowledge_graph [INFERRED 0.86]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.27
Nodes (11): addSortIndicators(), enableUI(), getNthColumn(), getTable(), getTableBody(), getTableHeader(), loadColumns(), loadData() (+3 more)

### Community 1 - "Community 1"
Cohesion: 0.25
Nodes (11): analyzePlanningInput(), buildAssumptions(), calculateScore(), extractActions(), extractByKeywords(), extractEntities(), extractPersonas(), getMissingFields() (+3 more)

### Community 2 - "Community 2"
Cohesion: 0.35
Nodes (8): a(), B(), D(), g(), i(), k(), Q(), y()

### Community 3 - "Community 3"
Cohesion: 0.2
Nodes (10): AST-Only No API Cost Update, Code Modification Session, God Nodes and Community Structure, GRAPH_REPORT.md, Graphify Knowledge Graph, graphify update, Graphify Wiki Index, Rationale: Prefer Graph Navigation Over Raw File Reading (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.73
Nodes (6): Cross-Module Relationship Questions, EXTRACTED and INFERRED Edges, graphify explain, graphify path, graphify query, grep

### Community 5 - "Community 5"
Cohesion: 0.7
Nodes (4): goToNext(), goToPrevious(), makeCurrent(), toggleClass()

## Knowledge Gaps
- **5 isolated node(s):** `God Nodes and Community Structure`, `Raw Files`, `Code Modification Session`, `AST-Only No API Cost Update`, `Rationale: Keep Graph Current After Code Changes`
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Rationale: Prefer Graph Navigation Over Raw File Reading` connect `Community 3` to `Community 4`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `Cross-Module Relationship Questions` connect `Community 4` to `Community 3`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `graphify query` (e.g. with `graphify explain` and `graphify path`) actually correct?**
  _`graphify query` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `God Nodes and Community Structure`, `Raw Files`, `Code Modification Session` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._