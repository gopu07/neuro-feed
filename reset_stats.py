import sys
import os

# Ensure backend directory is in the import path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))

from db.database import SessionLocal
from db.models import User, UserInteraction, UserCardStatus, ReviewHistory, UserXpTransaction, UserActivityEvent, UserQuizAttempt

def reset_db_stats():
    db = SessionLocal()
    try:
        print("Connecting to database & starting full reset pipeline...")

        # 1. Delete all learning history and transaction logs
        interactions_deleted = db.query(UserInteraction).delete()
        card_status_deleted = db.query(UserCardStatus).delete()
        history_deleted = db.query(ReviewHistory).delete()
        xp_transactions_deleted = db.query(UserXpTransaction).delete()
        activity_deleted = db.query(UserActivityEvent).delete()
        quiz_attempts_deleted = db.query(UserQuizAttempt).delete()

        print(f"• Deleted {interactions_deleted} interaction events.")
        print(f"• Deleted {card_status_deleted} spaced repetition status states.")
        print(f"• Deleted {history_deleted} spaced repetition historical reviews.")
        print(f"• Deleted {xp_transactions_deleted} XP transactional histories.")
        print(f"• Deleted {activity_deleted} user active event items.")
        print(f"• Deleted {quiz_attempts_deleted} user quiz selections.")

        # 2. Reset User XP, Streak Counters, and Shield configurations
        users = db.query(User).all()
        for user in users:
            print(f"• Resetting metrics for: {user.email or user.username} (was {user.xp} XP, {user.streak_days} streak)")
            user.xp = 0
            user.streak_days = 0
            user.last_active_date = None
            user.streak_shield = False

        db.commit()
        print("\nSUCCESS: All profiles and progress have been successfully reset to 0!")
    except Exception as e:
        db.rollback()
        print(f"\nERROR: Reset failed with exception: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    reset_db_stats()
