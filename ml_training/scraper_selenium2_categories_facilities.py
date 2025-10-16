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
listing_elements = driver.find_elements(By.CLASS_NAME, "d870ae17")

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

        # CLICK "View More" button if it exists to expand hidden amenities
        view_more_clicked = False
        try:
            # Strategy 1: Find by class name
            view_more_buttons = driver.find_elements(By.CLASS_NAME, "_2b5fcdea")
            for button in view_more_buttons:
                if button.is_displayed() and "View More" in button.text:
                    driver.execute_script("arguments[0].scrollIntoView(true);", button)
                    time.sleep(0.5)
                    driver.execute_script("arguments[0].click();", button)
                    time.sleep(1.5)
                    view_more_clicked = True
                    break
        except Exception as e:
            print(f"  ✗ Strategy 1 failed: {e}")

        # Strategy 2: Find by XPath with aria-label
        if not view_more_clicked:
            try:
                view_more_button = driver.find_element(By.XPATH, "//div[@role='button' and @aria-label='View More']")
                if view_more_button.is_displayed():
                    driver.execute_script("arguments[0].scrollIntoView(true);", view_more_button)
                    time.sleep(0.5)
                    driver.execute_script("arguments[0].click();", view_more_button)
                    time.sleep(1.5)
                    view_more_clicked = True
            except Exception as e:
                print(f"  ✗ Strategy 2 failed: {e}")

        # Strategy 3: Find by text content
        if not view_more_clicked:
            try:
                view_more_button = driver.find_element(By.XPATH, "//div[@role='button' and contains(text(), 'View More')]")
                if view_more_button.is_displayed():
                    driver.execute_script("arguments[0].scrollIntoView(true);", view_more_button)
                    time.sleep(0.5)
                    driver.execute_script("arguments[0].click();", view_more_button)
                    time.sleep(1.5)
                    view_more_clicked = True
            except Exception as e:
                print(f"  ✗ Strategy 3 failed: {e}")

        if not view_more_clicked:
            print(f"  ℹ No 'View More' button found or already expanded")

        # Extract ALL amenity categories dynamically
        amenities_dict = {}
        try:
            # Get all category headers and facility lists
            all_elements = driver.find_elements(By.XPATH, "//li[@class='_51519f00'] | //ul[@class='_3efd3392']")
            
            current_category = None
            
            for elem in all_elements:
                elem_class = elem.get_attribute("class")
                
                # If it's a category header (li with _51519f00)
                if "_51519f00" in elem_class:
                    try:
                        category_name = elem.find_element(By.CLASS_NAME, "d0142259").text.strip()
                        if category_name:
                            current_category = category_name
                            amenities_dict[current_category] = []
                    except:
                        continue
                
                # If it's a facilities list (ul with _3efd3392)
                elif "_3efd3392" in elem_class and current_category:
                    try:
                        facility_items = elem.find_elements(By.CLASS_NAME, "_59261156")
                        
                        for item in facility_items:
                            try:
                                facility_text = item.find_element(By.CLASS_NAME, "_9121cbf9").text.strip()
                                if facility_text:
                                    amenities_dict[current_category].append(facility_text)
                            except:
                                continue
                    except:
                        continue
            
            # Convert lists to comma-separated strings
            for category in amenities_dict:
                if amenities_dict[category]:
                    amenities_dict[category] = ", ".join(amenities_dict[category])
                    #print(f"  ✓ {category}: {len(amenities_dict[category].split(', '))} facilities")
                else:
                    amenities_dict[category] = "N/A"
                    
        except Exception as e:
            print(f"⚠️ Error extracting amenities for {link}: {e}")

        print(f"✅ [{index+1}] Scraped: {title[:30]}...")

        # Combine property data (basic fields)
        property_data = {
            "Title": title,
            "Price": price,
            "Location": location,
            "Type": type,
            "Area": area,
            "Beds": beds,
            "Baths": baths,
            "Purpose": purpose,
            "Date Added": added,
            "URL": link
        }
        
        # Add all amenity categories as separate columns
        property_data.update(amenities_dict)

        data.append(property_data)

    except Exception as e:
        print(f"❌ Error scraping {link}: {e}")
        continue

# Save to CSV
df = pd.DataFrame(data)
df.to_csv("zameen_property_data.csv", index=False)

driver.quit()
print("✅ Data scraping complete. Saved to 'zameen_property_data.csv'")