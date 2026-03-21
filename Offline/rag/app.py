import streamlit as st
from PyPDF2 import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain_community.retrievers import BM25Retriever
from langchain_core.documents import Document
import os

st.set_page_config(page_title="RAG chat", layout="centered")
st.title("PDF RAG Application")
st.caption("Upload a PDF and ask questions about its content (BM25 Reranking enabled)")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


def bm25_rerank(query: str, docs: list[Document], top_k: int = 5) -> list[Document]:
    """Rerank FAISS-retrieved docs using BM25 scores."""
    bm25_retriever = BM25Retriever.from_documents(docs)
    bm25_retriever.k = top_k
    return bm25_retriever.invoke(query)


# Upload PDF
uploaded_file = st.file_uploader("Upload a PDF file", type=["pdf"])

if uploaded_file and OPENAI_API_KEY:
    with st.spinner("Processing PDF..."):
        # Extract text
        reader = PdfReader(uploaded_file)
        text = "\n".join(page.extract_text() or "" for page in reader.pages)

        # Split into chunks
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=300)
        chunks = splitter.split_text(text)
        docs = [Document(page_content=chunk) for chunk in chunks]

        # Embed and store
        embeddings = OpenAIEmbeddings()
        vectorstore = FAISS.from_documents(docs, embeddings)

        st.success(f"PDF processed — {len(chunks)} chunks indexed.")

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)
    faiss_retriever = vectorstore.as_retriever(search_kwargs={"k": 10})

    # Chat interface
    st.divider()
    st.subheader("Ask a question")

    if "messages" not in st.session_state:
        st.session_state.messages = []

    for msg in st.session_state.messages:
        st.chat_message(msg["role"]).write(msg["content"])

    question = st.chat_input("Type your question here...")
    if question:
        st.session_state.messages.append({"role": "user", "content": question})
        st.chat_message("user").write(question)

        with st.spinner("Thinking..."):
            # Step 1: FAISS retrieves top-10 candidates
            candidate_docs = faiss_retriever.invoke(question)

            # Step 2: BM25 reranks to top-5
            reranked_docs = bm25_rerank(question, candidate_docs, top_k=5)

            # Step 3: Build context from reranked docs and call LLM
            context = "\n\n".join(doc.page_content for doc in reranked_docs)
            prompt = f"Use the following context to answer the question.\n\nContext:\n{context}\n\nQuestion: {question}"
            answer = llm.invoke(prompt).content

        st.session_state.messages.append({"role": "assistant", "content": answer})
        st.chat_message("assistant").write(answer)

elif uploaded_file and not OPENAI_API_KEY:
    st.warning("Please enter your OpenAI API key in the sidebar.")
elif not uploaded_file and OPENAI_API_KEY:
    st.info("Please upload a PDF to get started.")
else:
    st.info("Enter your OpenAI API key in the sidebar and upload a PDF to begin.")