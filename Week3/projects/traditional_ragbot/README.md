# LRAG Streamlit Chatbot

Simple Streamlit app to upload files, create chunks, and answer queries using LangChain + OpenAI.

## Setup

1. Create virtual environment.
2. Install dependencies: `pip install -r requirements.txt`.
3. Set `OPENAI_API_KEY`.
4. Run: `streamlit run app.py`.

## Usage

- Upload `.txt`, `.pdf`, or `.docx` files.
- Click `Process Uploads`.
- You will get a notification of chunk count.
- Enter questions and click `Get Answer`.
