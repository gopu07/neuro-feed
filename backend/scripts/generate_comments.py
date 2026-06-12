import os
import json
import time
from groq import Groq
from dotenv import load_dotenv
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db.database import SessionLocal
from db.models import Card, CardComment

load_dotenv()

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

COMMENT_PROMPT = """
Generate 3 comments for an educational card about '{title}'.
The card content is: '{body}'

Return ONLY valid JSON with 3 comments (no markdown blocks, just raw JSON).
Requirements for each comment type:
- fun_fact: A surprising real fact about the concept.
- exercise: A thought-provoking question starting with "Think about this:".
- discussion: A debate prompt starting with "Hot take:" or "Debate:".

Output format:
{{
  "fun_fact": "...",
  "exercise": "...",
  "discussion": "..."
}}
"""

def generate_and_store_comments(card, db):
    prompt = COMMENT_PROMPT.format(title=card.title, body=card.body[:800])
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        data = json.loads(response.choices[0].message.content)
        for c_type in ["fun_fact", "exercise", "discussion"]:
            if c_type in data:
                db.add(CardComment(
                    card_id=card.id,
                    type=c_type,
                    content=data[c_type],
                    is_ai_generated=True
                ))
        db.commit()
        return True
    except Exception as e:
        print(f"  -> Error: {e}")
        db.rollback()
        return False

def main():
    db = SessionLocal()
    cards = db.query(Card).filter(Card.is_approved == True).all()
    
    missing = []
    for card in cards:
        count = db.query(CardComment).filter(CardComment.card_id == card.id).count()
        if count == 0:
            missing.append(card)

    print(f"Found {len(missing)} cards with 0 comments out of {len(cards)} total approved cards.")

    for i, card in enumerate(missing):
        print(f"[{i+1}/{len(missing)}] Generating comments for: {card.title}")
        success = generate_and_store_comments(card, db)
        if success:
            print(f"  -> Done.")
        else:
            print(f"  -> Failed, skipping.")
        if i < len(missing) - 1:
            print("  Sleeping 2s...")
            time.sleep(2)

    db.close()
    print("Comment pre-generation complete!")

if __name__ == "__main__":
    main()
