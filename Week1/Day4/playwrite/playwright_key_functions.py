from playwright.async_api import async_playwright
import asyncio

async def playwright_function():
    # Async / Await
    async with async_playwright() as p: # calling the imported function
        browser = await p.chromium.launch(headless = False) # opening browser in headless mode (in hidden mode, if we give headless=False, it opens the browser)
        pages = await browser.new_page() # create new browser tab (pages means tab here)

        #navigate to that tab
        await pages.goto("https://www.google.com")
        await pages.wait_for_timeout(1000) # keep browser open for 1000 mills seconds.
        await browser.close() # closing browser

    # css selectors 
    # 1. (F12 / inspect)
    # 2. Right click on the element => copy as xpath / selector


if __name__ == "__main__":
    asyncio.run(playwright_function())
