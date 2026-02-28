from playwright.sync_api import sync_playwright
from datetime import datetime
import os


def extract_metadata_edge(site_name: str):

    with sync_playwright() as p:

        # ✅ Launch Microsoft Edge (persistent profile)
        browser = p.chromium.launch_persistent_context(
            user_data_dir="edge_user_profile",
            channel="msedge",      # ⭐ Opens Microsoft Edge
            headless=False,
            args=[
                "--start-maximized",
                "--disable-blink-features=AutomationControlled"
            ]
        )

        page = browser.new_page()

        # 1️⃣ Open Bing
        page.goto("https://www.bing.com", wait_until="domcontentloaded")

        # 2️⃣ Use your XPath for Bing search bar
        search_box = page.locator('xpath=//*[@id="sb_form_q"]')
        search_box.fill(site_name)
        search_box.press("Enter")

        page.wait_for_timeout(4000)

        # 3️⃣ Click first search result
        page.locator("li.b_algo h2 a").first.click()
        page.wait_for_load_state("networkidle")

        # 4️⃣ Extract metadata
        meta_tags = page.locator("meta")
        count = meta_tags.count()

        metadata_text = f"""
Website Metadata Extraction
===========================

URL: {page.url}
Title: {page.title()}

Meta Tags
---------------------------------
"""

        for i in range(count):
            name = meta_tags.nth(i).get_attribute("name")
            prop = meta_tags.nth(i).get_attribute("property")
            content = meta_tags.nth(i).get_attribute("content")

            if content:
                tag = name if name else prop
                metadata_text += f"{tag}: {content}\n"

        metadata_text += f"\nExtracted At: {datetime.now()}\n"

        # 5️⃣ Save metadata file
        filename = f"{site_name.replace('.', '_')}_metadata.txt"

        with open(filename, "w", encoding="utf-8") as f:
            f.write(metadata_text)

        print(f"\n✅ Metadata saved at: {os.path.abspath(filename)}")

        browser.close()


if __name__ == "__main__":
    extract_metadata_edge("udemy.com")