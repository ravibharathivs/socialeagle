# Knowledge Graph vs Traditional RAG - Architecture Cheat Sheet

## 1) High-Level Architecture

```mermaid
flowchart LR
    A[Input Documents] --> B1[Traditional RAG Pipeline]
    A --> B2[Knowledge Graph Pipeline]

    B1 --> C1[Text Splitter → chunks]
    C1 --> D1[Embeddings]
    D1 --> E1[FAISS Vector Index]
    E1 --> F1[Retrieval (similarity)]
    F1 --> G1[LLM generate answer]

    B2 --> C2[Graphiti entity/fact extraction]
    C2 --> D2[Neo4j graph store]
    D2 --> E2[Graph search for relevant facts]
    E2 --> F2[LLM generate answer]

    G1 --> Z[Comparison + metrics]
    F2 --> Z
    Z --> H[Demo output + metrics plots]
```

## 2) Core Files

- `demo.py` — main script, menu, initialization, and comparisons.
- `traditional_rag/rag_pipeline.py` — load docs, split, build FAISS, query retrieval+LLM.
- `knowledge_graph/kg_pipeline.py` — build KG with Graphiti + Neo4j + query facts + generate answer.
- `comparison/compare.py` — compare side-by-side output, metrics, and insights.
- `comparison/visualize.py` — graph visualization to HTML.
- `sample_data/api_documentation.txt` — sample domain documentation.

## 3) Data Flow

1. **Load sample doc** (`demo.py` uses `TraditionalRAG.load_documents`).
2. **Traditional RAG**:
   - Split text into chunks
   - Convert each chunk to embeddings
   - Store embeddings in FAISS
   - Query uses vector similarity to retrieve context
   - LLM answers with retrieved chunks
3. **KG RAG**:
   - Add episodes (chunks) to Graphiti
   - Graphiti extracts entities/facts and writes to Neo4j
   - Query uses Graphiti search for relevant facts
   - LLM answers using KG facts

## 4) Key Component Responsibilities

- `TraditionalRAG`: pipeline class with `load_documents`, `build_index`, `query`, and performance metrics.
- `KnowledgeGraphRAG`: pipeline class with `add_documents_to_graph`, `query`, `get_graph_statistics`, and KG operations.
- `Graphiti`: core graph builder and retrieval engine (entity/fact extraction + similarity search).
- `Neo4j`: persistent graph database storing nodes/relationships.
- `LangChain`: used as embedding + LLM client in both pipelines.

## 5) How to Run

1. Start Neo4j (docker-compose).
2. Create `.env` from `.env.example`.
3. Install deps: `pip install -r requirements.txt`.
4. Run: `python demo.py`.

## 6) Quick Comparison (What to observe)

| Area | Traditional RAG | Knowledge Graph RAG |
|---|---|---|
| Representation | Vector chunks | Entities + relationships |
| Retrieval | Similarity search | Graph search / fact retrieval |
| Strength | fast generic QA | structured relationship reasoning |
| Best for | short factual queries | complex architecture / dependency questions |

## 7) Quick debugging pointers

- Neo4j not reachable: confirm `docker ps`, `NEO4J_URI` and creds in `.env`.
- Graph build slow: use shorter docs or run once then reuse existing graph.
- OpenAI errors: check key/limits and model names.
- Missing model: set `OPENAI_MODEL` and `OPENAI_EMBEDDING_MODEL` in `.env`.

## 8) Suggested Extensions

- Add document ingestion from directories or PDFs.
- Add an interactive Streamlit UI (for live user questions).
- Add a hybrid reranker that combines KG facts + vector context.
- Add prebuilt YAML mapping to standardize entity types and relation names.

---

## 9) Full Project Context (Detailed)

### Project Purpose
This project demonstrates and compares two retrieval-augmented generation approaches on the same document corpus:
1. Traditional RAG (vector retrieval from chunk embeddings)
2. Knowledge Graph RAG (Graphiti + Neo4j fact retrieval)

The core idea is that KG retrieval surfaces explicit relationships and multi-hop context, while Traditional RAG finds similar text chunks.

### File and Folder Roles

- `.env.example` and `.env`: config for OpenAI and Neo4j.
- `docker-compose.yml`: Neo4j service with APOC.
- `requirements.txt`: dependencies for LangChain, Graphiti, Neo4j, OpenAI, and Rich.
- `sample_data/api_documentation.txt`: sample domain documentation used by both systems.
- `demo.py`: interactive CLI for building systems, running comparisons, and generating graphs.
- `traditional_rag/`: RAG pipeline, indexing, and retrieval code.
- `knowledge_graph/`: graph pipeline, Graphiti ingestion, querying, graph stats.
- `comparison/`: comparison runner, metrics table outputs, and visualization.

### Detailed Flow in `demo.py`
1. Load env variables (`OPENAI_API_KEY`, `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`).
2. Initialize `TraditionalRAG`:
   - Load docs via `load_documents`.
   - Chunk with `RecursiveCharacterTextSplitter`.
   - Embed and store in FAISS.
   - Build retrieval QA chain.
3. Initialize `KnowledgeGraphRAG`:
   - Set up Graphiti with OpenAI client and Neo4j connection.
   - Build indexes and constraints.
   - If graph empty or rebuild requested, ingest docs as episodes using `graphiti.add_episode`.
   - Graphiti extracts entities/facts automatically and stores in Neo4j.
4. Compare by question:
   - Traditional: similarity retrieval + QA chain.
   - KG: Graphiti search + prompt-based LLM answer.
5. Output and metrics (query time, source chunks, facts, entities, relationships).

### Graph Construction and Querying
- **Graph Build**: Each document chunk is stored as an Episode object, then Graphiti extracts facts using built-in graph extraction capabilities.
- **Query**: Graphiti search returns candidate facts and nodes; pipeline collects them into `facts`, `entities`, `relationships`, then runs an LLM prompt with those facts.
- **Stats**: Node count, relationship count, entity count, episode count via Neo4j Cypher.

### Why this is valuable
- KG RAG is more interpretable and supports relationship-based reasoning.
- Traditional RAG is simpler and may work better for direct fact retrieval.
- The comparative demo helps decide when to use each approach.

### Execution and Outputs
- Start Neo4j: `docker-compose up -d` (ensures bolt + HTTP endpoints open).
- Run `python demo.py`.
- Use menu for:
  - Single question comparison
  - Full question suite (automated metrics + plots)
  - Visualize KG (`knowledge_graph.html`)
  - Interactive mode
  - Graph statistics

### Optional quick enhancements
- Add file ingestion with user-provided docs (PDF/TXT) in `demo.py` and KG ingestion.
- Add Streamlit UI for interactive browser-based KG vs RAG compare.
- Cache embeddings and graph to avoid repeated rebuild.

---

> This expanded section serves as full context for the project, suitable for documentation and handoff.

