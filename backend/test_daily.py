from db.database import SessionLocal
from db.models import Card, DailyChallenge, QuizOption
from api.routes.daily_challenge import _generate_daily_cards_via_groq, MOCK_DAILY_CARDS
from datetime import date

db = SessionLocal()
today = date.today()

challenge = db.query(DailyChallenge).filter(DailyChallenge.date == today).first()
if challenge:
    print(f"Deleting existing daily challenge for {today} to trigger generation...")
    # Delete cards associated with it
    for cid in challenge.card_ids:
        try:
            db.query(Card).filter(Card.id == cid).delete()
        except Exception:
            pass
    db.delete(challenge)
    db.commit()

print("Attempting to generate daily challenge...")
try:
    try:
        generated_cards_data = _generate_daily_cards_via_groq()
        print("Groq generated data successfully.")
    except Exception as e:
        print(f"Groq failed: {e}. Using fallback...")
        generated_cards_data = MOCK_DAILY_CARDS

    card_ids = []
    for data in generated_cards_data:
        c_type = str(data.get("type", "concept")).lower().strip()
        c_diff = str(data.get("difficulty", "beginner")).lower().strip()
        
        # Enforce enums strictly
        if c_type not in ["concept", "news", "quiz"]:
            c_type = "concept"
        if c_diff not in ["beginner", "intermediate", "advanced"]:
            c_diff = "beginner"
            
        c = Card(
            type=c_type,
            title=data["title"],
            body=data["body"],
            tldr=data.get("tldr", ""),
            domain=data.get("domain", "Fundamentals"),
            difficulty=c_diff,
            is_approved=True
        )
        db.add(c)
        db.flush()
        card_ids.append(c.id)
        
        if data.get("type") == "quiz" and "options" in data:
            for opt in data["options"]:
                q_opt = QuizOption(
                    card_id=c.id,
                    option_text=opt["text"],
                    is_correct=opt["is_correct"],
                    explanation=opt.get("explanation", "")
                )
                db.add(q_opt)
    
    challenge = DailyChallenge(date=today, card_ids=card_ids)
    db.add(challenge)
    db.commit()
    print("SUCCESS: Challenge generated and saved successfully!")
except Exception as err:
    db.rollback()
    print("FAILED with exception:")
    import traceback
    traceback.print_exc()
finally:
    db.close()
