import requests
from bs4 import BeautifulSoup
import csv

# Define the URL of the property listings page
url = "https://www.zameen.com/Houses_Property/Islamabad-3-1.html"  # Change as needed

# Set headers to avoid bot detection
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

# Send request to the website
response = requests.get(url, headers=headers)
soup = BeautifulSoup(response.text, "html.parser")

# Find all property listings (Main Container)
listings = soup.find_all("div", class_="b22b6883")  # This is the correct class for listings

# Open a CSV file to store results
with open("property_listings.csv", "w", newline="", encoding="utf-8") as file:
    writer = csv.writer(file)
    writer.writerow(["Title", "Price", "Location", "Area"])  # CSV Header

    # Loop through each listing
    for listing in listings:
        # Navigate deeper to find the nested price
        title = listing.select_one("._36dfb99f")
        title_text = title.text.strip() if title else "N/A"

        # Navigate deeper to find the nested price
        price = listing.select_one(".d870ae17 ._9524354f .cb0c0514 div ._2923a568 span.dc381b54")
        price_text = price.text.strip() if price else "N/A"

        # Find location (inside another div)
        location = listing.select_one("._52d0f124 .db1aca2f")
        location_text = location.text.strip() if location else "N/A"

        # Find area (inside another div)
        area = listing.select_one("._52d0f124 .af969661 .f0835674 ._5ca8f903 ._6d9b9b83 .d870ae17 .cb0c0514 ")
        area_text = area.text.strip() if area else "N/A"

        # Write to CSV
        writer.writerow([title_text, price_text, location_text, area_text])

print("✅ Data scraped and saved to 'property_listings.csv' successfully!")