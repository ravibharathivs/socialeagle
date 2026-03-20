import re
import streamlit as st

st.set_page_config(page_title="Minimal KG-RAG Chatbot", page_icon="🤖")
st.title("Minimal Knowledge Graph RAG Chatbot")
st.write("Ask questions and get answers from a tiny knowledge graph and uploaded texts.")

KG = [
    ("Python", "is a", "programming language"),
    ("Streamlit", "is used for", "building web apps"),
    ("Knowledge Graph", "stores", "entities and relations"),
    ("RAG", "stands for", "Retrieval Augmented Generation"),
    ("Graph", "has", "nodes and edges"),
    ("Nodes", "can be", "people, places, or concepts"),
    ("Edges", "describe", "relationships"),
    ("OpenAI", "provides", "LLM APIs"),
]

base_passages = [f"{h} {r} {t}." for h, r, t in KG]


def text_to_passages(text, max_len=240):
    text = text.replace("\n", " ")
    sentences = re.split(r"(?<=[.?!])\s+", text)
    out = []
    for s in sentences:
        s = s.strip()
        if not s:
            continue
        if len(s) <= max_len:
            out.append(s)
        else:
            for i in range(0, len(s), max_len):
                out.append(s[i : i + max_len].strip())
    return out


def retrieve(query, all_passages, top_k=3):
    query_words = set(re.findall(r"\w+", query.lower()))
    scores = []
    for p in all_passages:
        p_words = set(re.findall(r"\w+", p.lower()))
        score = len(query_words & p_words)
        scores.append((score, p))
    scores.sort(key=lambda x: x[0], reverse=True)
    results = [p for s, p in scores if s > 0]
    if not results:
        results = all_passages[:top_k]
    return results[:top_k]


def generate_answer(query, context):
    if not context:
        return "I couldn't find an answer from the graph or uploaded documents. Try a different question or upload a relevant file."
    return "Here are relevant facts from graph/file context:\n- " + "\n- ".join(context)

if "history" not in st.session_state:
    st.session_state.history = []
if "docs" not in st.session_state:
    st.session_state.docs = []

uploaded = st.file_uploader("Upload text or PDF file to add to retrieval", type=["txt", "pdf"], accept_multiple_files=True)
if uploaded:
    for f in uploaded:
        content = ""
        if f.type == "application/pdf" or f.name.lower().endswith(".pdf"):
            try:
                from pypdf import PdfReader
                reader = PdfReader(f)
                texts = []
                for page in reader.pages:
                    txt = page.extract_text()
                    if txt:
                        texts.append(txt)
                content = "\n".join(texts)
            except Exception:
                content = ""
        else:
            try:
                content = f.read().decode("utf-8", errors="ignore")
            except Exception:
                content = ""
        st.session_state.docs.extend(text_to_passages(content))
    st.success(f"Loaded {len(uploaded)} file(s).")

all_passages = base_passages + st.session_state.docs

with st.form("chat_form"):
    query = st.text_input("Your question", value="", placeholder="Ask about Python, Streamlit, Knowledge Graph, or uploaded file content")
    submit = st.form_submit_button("Send")

if submit and query:
    retrieved = retrieve(query, all_passages)
    bot_answer = generate_answer(query, retrieved)
    st.session_state.history.append((query, bot_answer, retrieved))

for q, ans, retrieved in reversed(st.session_state.history):
    st.markdown(f"**You:** {q}")
    st.markdown("**Retrieved facts:**")
    for r in retrieved:
        st.markdown(f"- {r}")
    st.markdown(f"**Bot:** {ans}")
    st.markdown("---")
