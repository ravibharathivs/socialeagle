from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

driver = webdriver.Chrome()

driver.get("https://the-internet.herokuapp.com")
driver.back()
driver.forward()
driver.refresh()

#Finding elements

#byId
element = driver.find_element(By.ID,"content")

# by xpath for "content"
element = driver.find_by_element(By.XPATH,'//*[@id="hot-spot"]')

#wait
wait = WebDriverWait(driver,10)
element = wait.until(EC.presence_of_element_located(By.id,"content"))


#Interactions
element.click()
element.send_keys('socialeagle')
element.clear()

#screenshots
driver.save_screenshot("demo.png")