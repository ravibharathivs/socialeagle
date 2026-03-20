import os
import textwrap
from typing import Dict, List, Tuple

import streamlit as st
from openai import OpenAI
import requests

OPENAI_MODEL_EMBED = "text-embedding-3-small"
OPENAI_MODEL_CHAT = "gpt-4o-mini"

openai_key = os.getenv("OPENAI_API_KEY")
serp_key = os.getenv("SERPAPI_KEY")


def load_dotenv(path: str = ".env") -> None:
    if not os.path.isfile(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))


load_dotenv()


def cosine_similarity(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = sum(x * x for x in a) ** 0.5
    mag_b = sum(y * y for y in b) ** 0.5
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def chunk_text(text: str, chunk_size: int = 220, overlap: int = 40) -> List[str]:
    text = text.replace("\n", " ")
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunks.append(" ".join(words[i : i + chunk_size]))
        i += chunk_size - overlap
    return chunks


def embed_texts(client: OpenAI, texts: List[str]) -> List[List[float]]:
    if not texts:
        return []
    resp = client.embeddings.create(model=OPENAI_MODEL_EMBED, input=texts)
    return [getattr(item, "embedding", None) or item.embedding for item in resp.data]


def build_index(client: OpenAI, docs: List[Tuple[str, str]]) -> List[Dict]:
    entries = []
    all_chunks = []
    for name, text in docs:
        for i, chunk in enumerate(chunk_text(text)):
            entries.append({"doc": name, "chunk_id": i, "text": chunk})
            all_chunks.append(chunk)
    if not entries:
        return []
    embeddings = embed_texts(client, all_chunks)
    for entry, emb in zip(entries, embeddings):
        entry["embedding"] = emb
    return entries


def retrieve(client: OpenAI, query: str, index: List[Dict], top_k: int = 3) -> List[Dict]:
    if not index:
        return []
    q_emb = embed_texts(client, [query])[0]
    scored = []
    for item in index:
        score = cosine_similarity(q_emb, item["embedding"])
        scored.append((score, item))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [item for _, item in scored[:top_k]]


def answer_from_context(client: OpenAI, question: str, retrieved: List[Dict]) -> str:
    context = "\n---\n".join([f"Doc:{r['doc']}\n{r['text']}" for r in retrieved])
    prompt = textwrap.dedent(
        f"""
        Use only the context below to answer the question.
        If the answer is not present, say 'NOT IN DOCUMENTS'.
        
        QUESTION: {question}
        CONTEXT:
        {context}
        """
    )
    resp = client.chat.completions.create(
        model=OPENAI_MODEL_CHAT,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=300,
    )
    if hasattr(resp.choices[0].message, "content"):
        return resp.choices[0].message.content.strip()
    return resp.choices[0]["message"]["content"].strip()


def search_web(serp_api_key: str, query: str) -> str:
    url = "https://serpapi.com/search"
    params = {
        "q": query,
        "api_key": serp_api_key,
        "engine": "google",
        "num": 3,
    }
    resp = requests.get(url, params=params, timeout=20)
    if resp.status_code != 200:
        return f"SerpAPI search failed ({resp.status_code})"
    data = resp.json()
    snippets = []
    for item in data.get("organic_results", []):
        title = item.get("title", "")
        snippet = item.get("snippet", "")
        link = item.get("link", "")
        snippets.append(f"{title}\n{snippet}\n{link}")
    if not snippets:
        return "No web results found."
    return "\n\n".join(snippets)


def answer_from_search(client: OpenAI, question: str, web_text: str) -> str:
    prompt = textwrap.dedent(
        f"""
        You are an assistant. Answer this question using the extracted web snippets below.
        Question: {question}
        Web snippets:
        {web_text}
        """
    )
    resp = client.chat.completions.create(
        model=OPENAI_MODEL_CHAT,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=300,
    )
    if hasattr(resp.choices[0].message, "content"):
        return resp.choices[0].message.content.strip()
    return resp.choices[0]["message"]["content"].strip()


def main():
    st.set_page_config(page_title="Minimal Streamlit Agentic RAG", page_icon="🤖")
    st.title("Minimal Streamlit Agentic RAG")

    uploaded = st.file_uploader("Upload text docs (txt/md)", type=["txt", "md"], accept_multiple_files=True)
    question = st.text_input("Ask a question")

    if st.button("Run"):  # single action includes both features 
        if not question.strip():
            st.error("Type a question.")
            return

        client = OpenAI(api_key=openai_key)
        docs = []
        for f in uploaded:
            try:
                text = f.read().decode("utf-8", errors="ignore")
            except Exception:
                text = ""
            if text.strip():
                docs.append((f.name, text))

        if not docs:
            st.warning("No docs uploaded. Answering from web only.")
            web_text = search_web(serp_key, question)
            answer = answer_from_search(client, question, web_text)
            st.subheader("Answer (web)")
            st.write(answer)
            return

        index = build_index(client, docs)
        if not index:
            st.error("No document chunks built.")
            return

        retrieved = retrieve(client, question, index, top_k=3)
        top_text = retrieved[0]["text"]
        st.markdown("**Best doc match:**")
        st.write(retrieved[0]["doc"])

        doc_answer = answer_from_context(client, question, retrieved)
        if "NOT IN DOCUMENTS" in doc_answer.upper() or len(doc_answer.strip()) < 20:
            st.info("Not found in docs; doing web search fallback...")
            web_text = search_web(serp_key, question)
            web_answer = answer_from_search(client, question, web_text)
            st.subheader("Answer (web search fallback)")
            st.write(web_answer)
        else:
            st.subheader("Answer (from docs)")
            st.write(doc_answer)


if __name__ == "__main__":
    main()
