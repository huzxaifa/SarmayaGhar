from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
import pandas as pd
import time

# Path to your ChromeDriver executable
chrome_driver_path = r"C:\WebDriver"

# Set up the ChromeDriver service
service = Service(chrome_driver_path)

# Initialize the WebDriver
driver = webdriver.Chrome()

# URL of the property listings page
url = "https://www.zameen.com/Houses_Property/Lahore-1-1.html"

# Open the URL
driver.get(url)
time.sleep(5)  # Wait for the page to load

# Find all property listings (Main Containers)
listings = driver.find_elements(By.CLASS_NAME, "b22b6883")  # Update class name based on website structure

# Extract data from each listing
data = []
for listing in listings:
    # Extract title
    title = listing.find_element(By.CSS_SELECTOR, "._36dfb99f")
    title_text = title.text.strip() if title else "N/A"

    # Extract price
    price = listing.find_element(By.CSS_SELECTOR, ".d870ae17 ._9524354f .cb0c0514 div ._2923a568 span.dc381b54")
    price_text = price.text.strip() if price else "N/A"

    # Extract location
    location = listing.find_element(By.CSS_SELECTOR, "._52d0f124 .db1aca2f")
    location_text = location.text.strip() if location else "N/A"

    # Extract area
    area = listing.find_element(By.CSS_SELECTOR, "._52d0f124 .af969661 .f0835674 ._5ca8f903 ._6d9b9b83 .d870ae17 .cb0c0514")
    area_text = area.text.strip() if area else "N/A"

    # Append data to the list
    data.append({"Title": title_text, "Price": price_text, "Location": location_text, "Area": area_text})

# Save data to a CSV file
df = pd.DataFrame(data)
df.to_csv("property_listings_selenium.csv", index=False)

# Close the browser
driver.quit()

print("✅ Data scraped and saved to 'property_listings_selenium.csv' successfully!")