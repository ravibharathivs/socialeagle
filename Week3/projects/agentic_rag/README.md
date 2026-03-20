# Simple No-Framework Agentic RAG

This is a minimal agentic Retrieval-Augmented Generation example in plain Python (no LangChain, no framework).

## Setup

1. Create and activate your Python environment.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set `OPENAI_API_KEY` in your environment.

## Add knowledge documents

Place text files (`*.txt`, `*.md`) into `docs/` under this folder. If `docs/` does not exist, built-in sample docs are used.

## Run

Interactive mode:
```bash
python app.py --interactive
```

Single query:
```bash
python app.py --query "What is SocialEagle?"
```

## How it works

1. It loads documents and chunks them into text passages.
2. It embeds the chunks and performs cosine similarity retrieval.
3. It calls OpenAI chat to generate an answer from retrieved context.

This is intentionally simple and direct to demonstrate agentic RAG flow with retrieval + reasoning.
