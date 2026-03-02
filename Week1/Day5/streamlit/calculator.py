import streamlit as st

st.title("Simple calculator")

num1 = st.number_input("Enter the num1")
num2 = st.number_input("Enter the num2")

operation = st.selectbox("Choose operation:",["Add","Subtract","Multiply","Divide"])

if st.button("Calculate"):
    if operation == "Add":
        result = num1 + num2
    elif operation == "Subtract":
        result = num1-num2
    elif operation == "Multiply":
        result = num1 * num2
    elif operation == "Divide":
        if num2 != 0:
            result = num1/num2
        else:
            st.error("enter proper value, 0 cannot be used to divide")
            result = None
    if result is not None:
        st.success(f"Result : {result}")
            