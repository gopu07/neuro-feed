import os
import sys
import json
import time
from groq import Groq
from dotenv import load_dotenv

# Add parent directory to path so we can import from db
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db.database import SessionLocal
from db.models import Card

load_dotenv()

def main():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("GROQ_API_KEY not set")
        return
        
    groq_client = Groq(api_key=api_key)
    db = SessionLocal()
    
    cards = db.query(Card).filter(Card.hook_line.is_(None)).all()
    print(f"Found {len(cards)} cards needing backfill.")
    
    for card in cards:
        print(f"Processing: {card.title}")
        prompt = f"""
Generate a 'hook_line' and 'why_it_matters' for this learning card if it doesn't have them.
Title: {card.title}
Body: {card.body}

hook_line rules: Single sentence, max 15 words, creates curiosity gap. Format: 'You already use [X] every time you [common action].' OR 'Most people think [X] but actually [surprising truth].'
why_it_matters rules: 1-2 sentences, max 50 words. Real-world professional relevance.

Return ONLY valid JSON: {{"hook_line": "...", "why_it_matters": "..."}}
"""
        try:
            res = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            data = json.loads(res.choices[0].message.content)
            
            if not card.hook_line:
                card.hook_line = data.get("hook_line")
            if not card.why_it_matters:
                card.why_it_matters = data.get("why_it_matters")
                
            db.commit()
            print(f"  -> hook_line: {card.hook_line}")
        except Exception as e:
            print(f"Error: {e}")
            db.rollback()
            
        time.sleep(2)

if __name__ == "__main__":
    main()
