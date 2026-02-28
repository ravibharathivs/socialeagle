from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from webdriver_manager.chrome import ChromeDriverManager
import time
import random
import string


def generate_strong_password():
    upper = random.choice(string.ascii_uppercase)
    lower = random.choice(string.ascii_lowercase)
    digit = random.choice(string.digits)
    special = random.choice("!@#$%^&*")
    remaining = ''.join(random.choices(
        string.ascii_letters + string.digits + "!@#$%^&*",
        k=8
    ))
    return upper + lower + digit + special + remaining


def selenium_signup_login():

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()))
    driver.maximize_window()

    wait = WebDriverWait(driver, 15)

    driver.get("https://demoqa.com/login")

    # -------------------------
    # SIGNUP FLOW
    # -------------------------

    # Click "New User"
    wait.until(EC.element_to_be_clickable((By.ID, "newUser"))).click()

    # Fill registration form
    username = "TestUser" + str(random.randint(1000, 9999))
    password = generate_strong_password()

    wait.until(EC.visibility_of_element_located((By.ID, "firstname"))).send_keys("John")
    driver.find_element(By.ID, "lastname").send_keys("Doe")
    driver.find_element(By.ID, "userName").send_keys(username)
    driver.find_element(By.ID, "password").send_keys(password)

    print(f"Generated Username: {username}")
    print(f"Generated Strong Password: {password}")

    print("⚠️ Manual captcha solving required on this demo site.")
    input("After solving CAPTCHA manually, press ENTER to continue...")

    driver.find_element(By.ID, "register").click()

    time.sleep(3)

    # -------------------------
    # LOGIN FLOW
    # -------------------------

    wait.until(EC.visibility_of_element_located((By.ID, "userName"))).send_keys(username)
    driver.find_element(By.ID, "password").send_keys(password)
    driver.find_element(By.ID, "login").click()

    # Verify successful login
    try:
        logout_button = wait.until(
            EC.visibility_of_element_located((By.ID, "submit"))
        )

        if logout_button.text.lower() == "log out":
            print("✅ LOGIN TEST PASSED")
        else:
            print("❌ LOGIN TEST FAILED")

    except:
        print("❌ LOGIN FAILED")

    time.sleep(5)
    driver.quit()


if __name__ == "__main__":
    selenium_signup_login()