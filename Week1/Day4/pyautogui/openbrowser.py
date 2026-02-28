import pyautogui
import time
import webbrowser
import pyperclip

# Safety delay (move mouse to top-left to stop)
pyautogui.FAILSAFE = True

def search_cricket_score():

    # 1️⃣ Open browser (Chrome)
    webbrowser.open("https://www.google.com")
    time.sleep(5)  # wait browser load

    # 2️⃣ Click search box (center of screen)
    screen_width, screen_height = pyautogui.size()
    pyautogui.click(screen_width / 2, screen_height / 2)

    time.sleep(1)

    # 3️⃣ Type search query
    pyautogui.write("latest cricket match score", interval=0.05)
    pyautogui.press("enter")

    time.sleep(5)

    # 4️⃣ Click first search result
    # Adjust coordinates if needed for your screen
    pyautogui.click(600, 350)

    time.sleep(6)

    # 5️⃣ Select visible text (approx area)
    pyautogui.moveTo(500, 400)
    pyautogui.dragTo(1000, 600, duration=1, button="left")

    # Copy selected text
    pyautogui.hotkey("ctrl", "c")
    time.sleep(1)

    score = pyperclip.paste()

    print("\n===== MATCH SCORE =====\n")
    print(score)


if __name__ == "__main__":
    print("Automation starting in 5 seconds...")
    time.sleep(5)
    search_cricket_score()