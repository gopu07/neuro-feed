import os
import json
import sys
from pywebpush import webpush, WebPushException

# Add backend directory to path so imports work
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import SessionLocal
from db.models import PushSubscription, UserCardStatus
from datetime import date
from dotenv import load_dotenv

load_dotenv()

def send_daily_reminders():
    db = SessionLocal()
    try:
        today = date.today()
        # Find all users who have cards due today
        due_users = db.query(UserCardStatus.user_id).filter(
            UserCardStatus.next_review_date <= today
        ).distinct().all()

        vapid_private_key = os.environ.get("VAPID_PRIVATE_KEY")
        vapid_claims = {"sub": os.environ.get("VAPID_CLAIMS_EMAIL", "mailto:admin@neurofeed.local")}

        if not vapid_private_key:
            print("VAPID_PRIVATE_KEY not set. Aborting push notifications.")
            return

        count = 0
        for (user_id,) in due_users:
            subs = db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all()
            for sub in subs:
                try:
                    webpush(
                        subscription_info={
                            "endpoint": sub.endpoint,
                            "keys": {"p256dh": sub.p256dh, "auth": sub.auth}
                        },
                        data=json.dumps({
                            "title": "NeuroFeed",
                            "body": "You have cards due for review! Jump in and keep your streak alive."
                        }),
                        vapid_private_key=vapid_private_key,
                        vapid_claims=vapid_claims
                    )
                    count += 1
                except WebPushException as ex:
                    print(f"Failed to send to {sub.endpoint}: {repr(ex)}")
        print(f"Sent {count} notifications.")
    finally:
        db.close()

if __name__ == "__main__":
    send_daily_reminders()
