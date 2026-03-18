"""
Generate placeholder PNG icons for the AutoTranscripter Chrome Extension.
Requires: pip install Pillow
"""

from PIL import Image, ImageDraw
import os

ICONS_DIR = os.path.join(os.path.dirname(__file__), "icons")
os.makedirs(ICONS_DIR, exist_ok=True)

SIZES = [16, 48, 128]

# Colors
BG_COLOR = (17, 17, 24)         # Dark navy background
MIC_COLOR = (255, 255, 255)     # White microphone
ACCENT_COLOR = (255, 59, 48)    # Red accent (recording indicator)
RING_COLOR = (52, 199, 89, 60)  # Green semi-transparent ring


def draw_microphone(draw: ImageDraw.ImageDraw, size: int):
    """Draw a simple microphone icon scaled to the given size."""
    s = size
    cx = s // 2  # center x

    # Scale factors
    body_w = max(int(s * 0.30), 4)
    body_h = max(int(s * 0.38), 6)
    body_r = body_w // 2

    body_top = int(s * 0.10)
    body_bot = body_top + body_h

    # Mic body (rounded rectangle)
    draw.rounded_rectangle(
        [cx - body_w // 2, body_top, cx + body_w // 2, body_bot],
        radius=body_r,
        fill=MIC_COLOR
    )

    # Arc (sound pickup curve) — drawn as an ellipse arc
    arc_margin = int(s * 0.12)
    arc_top = body_top + int(s * 0.08)
    arc_bot = body_bot + int(s * 0.12)
    arc_left = cx - int(s * 0.30)
    arc_right = cx + int(s * 0.30)

    # Draw arc as thick outline of bottom half of an ellipse
    arc_width = max(1, int(s * 0.06))
    for offset in range(arc_width):
        draw.arc(
            [arc_left + offset, arc_top + offset,
             arc_right - offset, arc_bot - offset],
            start=0, end=180,
            fill=MIC_COLOR
        )

    # Stand (vertical line)
    stand_top = arc_bot - arc_width
    stand_bot = stand_top + int(s * 0.14)
    stand_w = max(1, arc_width)
    draw.rectangle(
        [cx - stand_w // 2, stand_top, cx + stand_w // 2, stand_bot],
        fill=MIC_COLOR
    )

    # Base (horizontal bar)
    base_w = int(s * 0.38)
    base_h = max(1, arc_width)
    base_top = stand_bot
    draw.rectangle(
        [cx - base_w // 2, base_top, cx + base_w // 2, base_top + base_h],
        fill=MIC_COLOR
    )


def generate_icon(size: int):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background circle
    margin = max(1, int(size * 0.04))
    draw.ellipse([margin, margin, size - margin, size - margin], fill=BG_COLOR)

    # Draw microphone
    if size >= 16:
        draw_microphone(draw, size)

    # Small red dot at top-right (recording indicator) — only for 48+ px
    if size >= 48:
        dot_r = max(3, int(size * 0.08))
        dot_x = size - margin - dot_r - 2
        dot_y = margin + dot_r
        draw.ellipse(
            [dot_x - dot_r, dot_y - dot_r, dot_x + dot_r, dot_y + dot_r],
            fill=ACCENT_COLOR
        )

    path = os.path.join(ICONS_DIR, f"icon{size}.png")
    img.save(path, "PNG")
    print(f"  Generated: {path}")
    return path


if __name__ == "__main__":
    print("Generating AutoTranscripter icons...")
    for size in SIZES:
        generate_icon(size)
    print("Done! Icons saved to icons/")
