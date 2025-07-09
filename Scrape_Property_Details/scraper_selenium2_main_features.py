from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import pandas as pd
import time

# Initialize the WebDriver using webdriver-manager
from webdriver_manager.chrome import ChromeDriverManager
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()))

# URL of the Zameen listings page
url = "https://www.zameen.com/Houses_Property/Lahore-1-1.html"
driver.get(url)
time.sleep(5)  # Allow page to load

# Extract all property links from clickable containers
property_links = []
listing_elements = driver.find_elements(By.CLASS_NAME, "d870ae17")  # The class that holds clickable links

for elem in listing_elements:
    link = elem.get_attribute("href")
    if link:
        property_links.append(link)

print(f"🔗 Found {len(property_links)} property links.")

# Now visit each link and extract details
data = []

for index, link in enumerate(property_links[:5]):  # Limit to first 5 for demo
    try:
        driver.get(link)
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CLASS_NAME, "aea614fd")))

        # Title
        try:
            title = driver.find_element(By.CLASS_NAME, "aea614fd").text.strip()
        except:
            title = "N/A"

        # Location
        try:
            location = driver.find_element(By.CLASS_NAME, "cd230541").text.strip()
        except:
            location = "N/A"

        # Price
        try:
            price_div = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, "_2923a568"))
            )
            full_price_text = price_div.get_attribute("innerText").strip()
            price = full_price_text if full_price_text else "N/A"
        except:
            price = "N/A"

        # Type, Beds, Baths, Area, Purpose, Added
        try:
            info_spans = driver.find_elements(By.CLASS_NAME, "_2fdf7fc5")
            
            type = info_spans[0].text.strip() if len(info_spans) > 0 else "N/A"
            baths = info_spans[3].text.strip() if len(info_spans) > 3 else "N/A"
            area = info_spans[4].text.strip() if len(info_spans) > 4 else "N/A"
            purpose = info_spans[5].text.strip() if len(info_spans) > 5 else "N/A"
            beds = info_spans[6].text.strip() if len(info_spans) > 6 else "N/A"            
            added = info_spans[7].text.strip() if len(info_spans) > 7 else "N/A"

        except Exception as e:
            beds = baths = area = purpose = added = "N/A"

        # Extract Main Features from Amenities section
        main_features = []
        try:
            # Try to find Main Features section by class and header
            main_features_section = driver.find_elements(By.XPATH, "//div[contains(text(), 'Main Features')]/following-sibling::ul | //div[contains(@class, '_83bb17d1')]//ul[contains(@class, '_49fc0232')]")
            if main_features_section:
                feature_items = main_features_section[0].find_elements(By.CLASS_NAME, "_59261156")
                for item in feature_items:
                    try:
                        feature_text = item.find_element(By.CLASS_NAME, "_9121cbf9").text.strip()
                        if ": " in feature_text:
                            main_features.append(feature_text)
                        else:
                            main_features.append(f"{feature_text}: Present")
                    except:
                        continue
            else:
                # Fallback to all _59261156 elements on the page
                feature_items = driver.find_elements(By.CLASS_NAME, "_59261156")
                for item in feature_items:
                    try:
                        feature_text = item.find_element(By.CLASS_NAME, "_9121cbf9").text.strip()
                        if ": " in feature_text:
                            main_features.append(feature_text)
                        else:
                            main_features.append(f"{feature_text}: Present")
                    except:
                        continue
        except Exception as e:
            print(f"⚠️ No Main Features found for {link}: {e}")

        # Combine main features into a single comma-separated string
        main_features_str = ", ".join(main_features) if main_features else "N/A"

        print(f"✅ [{index+1}] Scraped: {title[:30]}...")

        # Combine property data
        property_data = {
            "Title": title,
            "Price": price,
            "Location": location,
            "Type": type,
            "Area": area,
            "Beds": beds,
            "Baths": baths,
            "Purpose": purpose,
            "Added": added,
            "URL": link,
            "Main Features": main_features_str
        }

        data.append(property_data)

    except Exception as e:
        print(f"❌ Error scraping {link}: {e}")
        continue

# Save to CSV
df = pd.DataFrame(data)
df.to_csv("zameen_property_data.csv", index=False)

driver.quit()
print("✅ Data scraping complete. Saved to 'zameen_property_data.csv'")