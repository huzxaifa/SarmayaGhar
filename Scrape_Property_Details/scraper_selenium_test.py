from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import pandas as pd
import time
import random
import logging
import os

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Path to ChromeDriver executable
chrome_driver_path = r"C:\WebDriver\chromedriver.exe"

# Verify ChromeDriver exists
if not os.path.isfile(chrome_driver_path):
    logger.error(f"ChromeDriver not found at {chrome_driver_path}. Please download it from https://chromedriver.chromium.org/downloads and update the path.")
    raise FileNotFoundError(f"ChromeDriver not found at {chrome_driver_path}")

# Set up the ChromeDriver service
service = Service(chrome_driver_path)

# Initialize the WebDriver
try:
    driver = webdriver.Chrome(service=service)
except Exception as e:
    logger.error(f"Failed to initialize WebDriver: {e}")
    raise

# Define cities and their URL codes
cities = {
    'Lahore': 'Lahore-1',
    'Islamabad': 'Islamabad-3',
    'Rawalpindi': 'Rawalpindi-41',
    'Karachi': 'Karachi-2',
    'Faisalabad': 'Faisalabad-16',
    'Peshawar': 'Peshawar-17',
    'Quetta': 'Quetta-18',
    'Multan': 'Multan-15'
}

# Define property types
property_types = [
    'Houses_Property',
    'Flats_Apartments',
    'Upper_Portions',
    'Lower_Portions',
    'Farm_Houses',
    'Rooms',
    'Penthouse',
    'Residential_Plots',
    'Commercial_Plots',
    'Agricultural_Land',
    'Industrial_Land',
    'Offices',
    'Retail_Shops',
    'Warehouses',
    'Factories',
    'Buildings'
]

# List to store property data
data = []

def extract_property_details(property_url):
    """Extract details from a single property page."""
    try:
        driver.get(property_url)
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CLASS_NAME, '_64bb5b3b')))
        logger.info(f"Loaded property page: {property_url}")

        property_info = {'URL': property_url}

        # Extract title (placeholder, you'll update class)
        try:
            title = driver.find_element(By.CSS_SELECTOR, "._36dfb99f")
            property_info['Title'] = title.text.strip() if title else 'N/A'
        except:
            property_info['Title'] = 'N/A'

        # Extract price (placeholder, you'll update class)
        try:
            price = driver.find_element(By.CSS_SELECTOR, ".d870ae17 ._9524354f .cb0c0514 div ._2923a568 span.dc381b54")
            property_info['Price'] = price.text.strip() if price else 'N/A'
        except:
            property_info['Price'] = 'N/A'

        # Extract location (placeholder, you'll update class)
        try:
            location = driver.find_element(By.CSS_SELECTOR, "._52d0f124 .db1aca2f")
            property_info['Location'] = location.text.strip() if location else 'N/A'
        except:
            property_info['Location'] = 'N/A'

        # Extract area (placeholder, you'll update class)
        try:
            area = driver.find_element(By.CSS_SELECTOR, "._52d0f124 .af969661 .f0835674 ._5ca8f903 ._6d9b9b83 .d870ae17 .cb0c0514")
            property_info['Area'] = area.text.strip() if area else 'N/A'
        except:
            property_info['Area'] = 'N/A'

        # Extract additional details (e.g., bedrooms, bathrooms)
        try:
            details_list = driver.find_elements(By.CSS_SELECTOR, "ul._36ca3b69 li")
            for detail in details_list:
                label = detail.find_element(By.CSS_SELECTOR, "span._68e76d5f").text.strip()
                value = detail.find_element(By.CSS_SELECTOR, "span._2a0d85ff").text.strip()
                property_info[label] = value
        except:
            logger.warning(f"No details found on {property_url}")

        # Extract amenities
        try:
            amenities = driver.find_elements(By.CSS_SELECTOR, "div._1b2b48f9 span.b6a29bc0")
            property_info['Amenities'] = [amenity.text.strip() for amenity in amenities]
        except:
            property_info['Amenities'] = []
            logger.warning(f"No amenities found on {property_url}")

        # Extract description
        try:
            description = driver.find_element(By.CSS_SELECTOR, "div.d0ea0ea0")
            property_info['Description'] = description.text.strip() if description else 'N/A'
        except:
            property_info['Description'] = 'N/A'
            logger.warning(f"No description found on {property_url}")

        return property_info
    except Exception as e:
        logger.error(f"Error extracting details from {property_url}: {e}")
        return None

def scrape_search_page(page_url):
    """Scrape property links from a search results page."""
    try:
        driver.get(page_url)
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CLASS_NAME, 'b22b6883')))
        logger.info(f"Loaded search page: {page_url}")

        # Find all property listings
        listings = driver.find_elements(By.CLASS_NAME, "b22b6883")
        property_urls = []
        for listing in listings:
            try:
                link_div = listing.find_element(By.CLASS_NAME, "_3547d663")
                link = link_div.find_element(By.TAG_NAME, "a")
                property_urls.append(link.get_attribute('href'))
            except:
                continue

        logger.info(f"Found {len(property_urls)} listings on {page_url}")
        return property_urls
    except Exception as e:
        logger.error(f"Error scraping {page_url}: {e}")
        return []

def save_data():
    """Save collected data to CSV."""
    if data:
        df = pd.DataFrame(data)
        df.to_csv("property_listings_selenium.csv", index=False, encoding='utf-8')
        logger.info(f"Saved {len(data)} records to property_listings_selenium.csv")

def main():
    max_pages = 5  # Limit to 5 pages per property type per city
    try:
        for city, city_code in cities.items():
            for prop_type in property_types:
                logger.info(f"Scraping {prop_type} in {city}...")
                for page in range(1, max_pages + 1):
                    page_url = f"https://www.zameen.com/{prop_type}/{city_code}-{page}.html"
                    logger.info(f"Scraping page {page} of {prop_type} in {city}...")
                    property_urls = scrape_search_page(page_url)

                    if not property_urls:
                        logger.warning(f"No listings found for {prop_type} in {city} on page {page}.")
                        continue

                    for url in property_urls:
                        logger.info(f"Scraping property: {url}")
                        property_details = extract_property_details(url)
                        if property_details:
                            property_details['City'] = city
                            property_details['Property Type'] = prop_type.replace('_', ' ')
                            data.append(property_details)
                            save_data()  # Incremental save
                        time.sleep(random.uniform(1, 3))  # Random delay

                    time.sleep(random.uniform(2, 5))  # Delay between pages

    finally:
        save_data()  # Final save
        driver.quit()
        logger.info("Browser closed. Scraping completed.")

if __name__ == "__main__":
    main()