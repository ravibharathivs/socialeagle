import os
import streamlit as st
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain_community.llms import OpenAI
import PyPDF2
import docx

st.set_page_config(page_title="Traditional Chatbot", page_icon="🤖")
st.title("RAG Chatbot")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    st.error("Missing OPENAI_API_KEY")
    st.stop()


def read_file(f):
    name = f.name.lower()
    if name.endswith(".txt"):
        return f.read().decode("utf-8", errors="ignore")
    if name.endswith(".pdf"):
        r = PyPDF2.PdfReader(f)
        return "\n".join([p.extract_text() or "" for p in r.pages])
    if name.endswith(".docx"):
        d = docx.Document(f)
        return "\n".join([p.text for p in d.paragraphs])
    return f.read().decode("utf-8", errors="ignore")


def create_qa(texts):
    s = RecursiveCharacterTextSplitter(chunk_size=900, chunk_overlap=100)
    docs = s.create_documents(texts)
    emb = OpenAIEmbeddings(openai_api_key=OPENAI_API_KEY)
    store = FAISS.from_documents(docs, emb)
    retr = store.as_retriever(search_kwargs={"k": 4})
    llm = OpenAI(temperature=0.2, openai_api_key=OPENAI_API_KEY)
    return RetrievalQA.from_chain_type(llm=llm, chain_type="stuff", retriever=retr)

if "qa_chain" not in st.session_state:
    st.session_state.qa_chain = None

files = st.file_uploader("Upload files (.txt/.pdf/.docx)", type=["txt", "pdf", "docx"], accept_multiple_files=True)
if st.button("Process"):
    if not files:
        st.warning("Upload at least one file.")
    else:
        texts = [read_file(f) for f in files]
        texts = [t for t in texts if t.strip()]
        if not texts:
            st.error("No text extracted.")
        else:
            with st.spinner("Building QA chain..."):
                st.session_state.qa_chain = create_qa(texts)
            st.success("Ready. Ask a question.")

q = st.text_input("Ask a question")
if st.button("Answer"):
    if not q:
        st.warning("Type a question.")
    elif st.session_state.qa_chain is None:
        st.warning("Process files first.")
    else:
        with st.spinner("Answering..."):
            ans = st.session_state.qa_chain.run(q)
        st.write(ans)

