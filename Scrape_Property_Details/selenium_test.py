from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By

driver = webdriver.Chrome()  # or specify path: Service("path/to/chromedriver")
driver.get("https://www.google.com")
print(driver.title)
driver.quit()
