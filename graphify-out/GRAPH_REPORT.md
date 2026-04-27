# Graph Report - .  (2026-04-27)

## Corpus Check
- Corpus is ~96 words - fits in a single context window. You may not need a graph.

## Summary
- 16 nodes · 21 edges · 3 communities detected
- Extraction: 76% EXTRACTED · 24% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.82)
- Token cost: 96 input · 2,200 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Graph-First Guidance|Graph-First Guidance]]
- [[_COMMUNITY_Traversal Query Tools|Traversal Query Tools]]
- [[_COMMUNITY_Graph Update Workflow|Graph Update Workflow]]

## God Nodes (most connected - your core abstractions)
1. `graphify query` - 5 edges
2. `Graphify Knowledge Graph` - 4 edges
3. `Cross-Module Relationship Questions` - 4 edges
4. `graphify path` - 4 edges
5. `graphify explain` - 4 edges
6. `graphify update` - 4 edges
7. `grep` - 3 edges
8. `EXTRACTED and INFERRED Edges` - 3 edges
9. `GRAPH_REPORT.md` - 2 edges
10. `Graphify Wiki Index` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Rationale: Prefer Graph Navigation Over Raw File Reading` --rationale_for--> `Cross-Module Relationship Questions`  [INFERRED]
  AGENTS.md → AGENTS.md  _Bridges community 1 → community 0_
- `graphify update` --conceptually_related_to--> `Graphify Knowledge Graph`  [EXTRACTED]
  AGENTS.md → AGENTS.md  _Bridges community 0 → community 2_

## Hyperedges (group relationships)
- **Graphify Navigation Tools** — agents_graphify_query, agents_graphify_path, agents_graphify_explain, agents_extracted_and_inferred_edges [EXTRACTED 1.00]
- **Graph-First Codebase Question Workflow** — agents_graph_report, agents_graphify_wiki_index, agents_cross_module_relationship_questions, agents_graphify_knowledge_graph [INFERRED 0.86]

## Communities

### Community 0 - "Graph-First Guidance"
Cohesion: 0.33
Nodes (6): God Nodes and Community Structure, GRAPH_REPORT.md, Graphify Knowledge Graph, Graphify Wiki Index, Rationale: Prefer Graph Navigation Over Raw File Reading, Raw Files

### Community 1 - "Traversal Query Tools"
Cohesion: 0.73
Nodes (6): Cross-Module Relationship Questions, EXTRACTED and INFERRED Edges, graphify explain, graphify path, graphify query, grep

### Community 2 - "Graph Update Workflow"
Cohesion: 0.5
Nodes (4): AST-Only No API Cost Update, Code Modification Session, graphify update, Rationale: Keep Graph Current After Code Changes

## Knowledge Gaps
- **5 isolated node(s):** `God Nodes and Community Structure`, `Raw Files`, `Code Modification Session`, `AST-Only No API Cost Update`, `Rationale: Keep Graph Current After Code Changes`
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Graphify Knowledge Graph` connect `Graph-First Guidance` to `Graph Update Workflow`?**
  _High betweenness centrality (0.724) - this node is a cross-community bridge._
- **Why does `Rationale: Prefer Graph Navigation Over Raw File Reading` connect `Graph-First Guidance` to `Traversal Query Tools`?**
  _High betweenness centrality (0.514) - this node is a cross-community bridge._
- **Why does `Cross-Module Relationship Questions` connect `Traversal Query Tools` to `Graph-First Guidance`?**
  _High betweenness centrality (0.479) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `graphify query` (e.g. with `graphify explain` and `graphify path`) actually correct?**
  _`graphify query` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `God Nodes and Community Structure`, `Raw Files`, `Code Modification Session` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._