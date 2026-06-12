import uuid as uuid_lib
from datetime import date, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException

from db.database import SessionLocal
from db.models import Card, User, DailyChallenge, UserCardStatus, DailyChallengeCompletion, UserXpTransaction
from api.routes.daily_challenge import complete_today_challenge

def setup_test_data(db: Session):
    # 1. Create a test user
    test_email = f"test_exploit_{uuid_lib.uuid4().hex[:8]}@example.com"
    test_user = User(
        email=test_email,
        username="exploit_tester",
        xp=0,
        streak_days=0,
        last_active_date=None
    )
    db.add(test_user)
    db.flush()
    
    # 2. Create mock cards for daily challenge
    cards = []
    card_ids = []
    for i in range(6):
        c = Card(
            type="concept" if i < 5 else "quiz",
            title=f"Test Card {i}",
            body=f"Body for test card {i}",
            domain="Fundamentals",
            difficulty="beginner",
            is_approved=True
        )
        db.add(c)
        db.flush()
        cards.append(c)
        card_ids.append(c.id)
        
    # 3. Create daily challenge for today
    today = date.today()
    
    # Delete existing challenge for today if it exists to prevent conflict
    db.query(DailyChallenge).filter(DailyChallenge.date == today).delete()
    db.flush()
    
    challenge = DailyChallenge(
        date=today,
        card_ids=card_ids,
        status="pending"
    )
    db.add(challenge)
    db.flush()
    
    return test_user, challenge, cards

def run_tests():
    db = SessionLocal()
    print("--- STARTING DAILY CHALLENGE EXPLOIT TESTS ---")
    try:
        user, challenge, cards = setup_test_data(db)
        user_id = user.id
        card_ids = challenge.card_ids
        
        print(f"Created Test User ID: {user_id}")
        print(f"Created Daily Challenge with {len(card_ids)} cards.")
        
        # Test Case 1: 0 cards complete
        print("\nTest Case 1: 0 cards completed...")
        try:
            complete_today_challenge(current_user=user, db=db)
            print("[FAIL]: Earned rewards with 0 cards completed!")
            assert False, "Should have failed with 0 cards completed"
        except HTTPException as e:
            print(f"[PASS]: Blocked with status {e.status_code}, detail: {e.detail}")
            assert e.status_code == 400
            
        # Test Case 2: 1 card complete
        print("\nTest Case 2: 1 card completed...")
        db.add(UserCardStatus(user_id=user_id, card_id=card_ids[0], status="completed"))
        db.flush()
        try:
            complete_today_challenge(current_user=user, db=db)
            print("[FAIL]: Earned rewards with only 1 card completed!")
            assert False, "Should have failed with 1 card completed"
        except HTTPException as e:
            print(f"[PASS]: Blocked with status {e.status_code}, detail: {e.detail}")
            assert e.status_code == 400
            
        # Test Case 3: Partial completion (3 of 6 cards complete)
        print("\nTest Case 3: Partial completion (3/6)...")
        db.add(UserCardStatus(user_id=user_id, card_id=card_ids[1], status="completed"))
        db.add(UserCardStatus(user_id=user_id, card_id=card_ids[2], status="completed"))
        db.flush()
        try:
            complete_today_challenge(current_user=user, db=db)
            print("[FAIL]: Earned rewards with partial card completion!")
            assert False, "Should have failed with partial completion"
        except HTTPException as e:
            print(f"[PASS]: Blocked with status {e.status_code}, detail: {e.detail}")
            assert e.status_code == 400

        # Test Case 4: Full completion
        print("\nTest Case 4: Full completion (6/6)...")
        db.add(UserCardStatus(user_id=user_id, card_id=card_ids[3], status="completed"))
        db.add(UserCardStatus(user_id=user_id, card_id=card_ids[4], status="completed"))
        db.add(UserCardStatus(user_id=user_id, card_id=card_ids[5], status="completed"))
        db.flush()
        
        res = complete_today_challenge(current_user=user, db=db)
        print(f"[PASS]: Reward claimed successfully! Result: {res}")
        assert res["success"] is True
        assert res["xp_earned"] == 100
        
        # Test Case 5: Duplicate claim request
        print("\nTest Case 5: Duplicate claim request...")
        try:
            complete_today_challenge(current_user=user, db=db)
            print("[FAIL]: Claimed reward twice!")
            assert False, "Should have blocked duplicate claim"
        except HTTPException as e:
            print(f"[PASS]: Blocked duplicate with status {e.status_code}, detail: {e.detail}")
            assert e.status_code == 400
            
        print("\n--- ALL DAILY CHALLENGE EXPLOIT TESTS PASSED SUCCESSFULLY! ---")
        
    finally:
        db.rollback()
        db.close()

if __name__ == "__main__":
    run_tests()
