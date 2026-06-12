import os
import sys
from sqlalchemy import text
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db.database import SessionLocal

def fix_constraint():
    db = SessionLocal()
    try:
        connection = db.connection()
        print("Dropping referrals_referral_code_key unique constraint in PostgreSQL...")
        connection.execute(text("ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referral_code_key;"))
        db.commit()
        print("SUCCESS: Unique constraint dropped successfully!")
    except Exception as e:
        db.rollback()
        print(f"FAILED: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_constraint()
