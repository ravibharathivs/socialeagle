import streamlit as st
import qrcode
from PIL import Image
import io

st.title("QR Code Generator")
st.write("Enter text or a URL to generate a QR code.")

text = st.text_input("Text / URL", placeholder="https://example.com")

col1, col2 = st.columns(2)
with col1:
    fg_color = st.color_picker("Foreground Color", "#000000")
with col2:
    bg_color = st.color_picker("Background Color", "#FFFFFF")

box_size = st.slider("Box Size", min_value=5, max_value=20, value=10)
border = st.slider("Border Size", min_value=1, max_value=10, value=4)

if st.button("Generate QR Code"):
    if not text.strip():
        st.warning("Please enter some text or a URL.")
    else:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=box_size,
            border=border,
        )
        qr.add_data(text)
        qr.make(fit=True)

        img = qr.make_image(fill_color=fg_color, back_color=bg_color).convert("RGB")

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)

        st.image(img, caption="Your QR Code", use_container_width=False)

        st.download_button(
            label="Download QR Code",
            data=buf,
            file_name="qrcode.png",
            mime="image/png",
        )
