import os
import sys
from dotenv import load_dotenv

# Ensure the backend directory is in the Python search path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

load_dotenv('backend/.env')

from db.database import SessionLocal
from agents.news_aggregator import NewsAggregator

print("Starting news aggregator run...")
db = SessionLocal()
try:
    aggregator = NewsAggregator()
    print("Fetching RSS feeds and generating summaries via Groq...")
    aggregator.fetch_and_store(db)
    print("Done! Check your feed now.")
except Exception as e:
    print(f"Error occurred: {e}")
finally:
    db.close()
