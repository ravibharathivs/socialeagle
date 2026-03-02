import streamlit as st

st.title("My First Stream lit App")

name = st.text_input("Enter your name")

if st.button("day hello"):
    if name:
        st.success(f"Hello {name}, Welcome to my page")
    else:
        st.warning("Please enter valid name")