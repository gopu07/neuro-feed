from apscheduler.schedulers.background import BackgroundScheduler
from agents.news_aggregator import NewsAggregator
from db.database import SessionLocal
from db.models import User, PushSubscription, UserCardStatus, Card
from datetime import date, timedelta
from config import settings
import json
from pywebpush import webpush, WebPushException

scheduler = BackgroundScheduler()

def fetch_news_job():
    db = SessionLocal()
    try:
        aggregator = NewsAggregator()
        aggregator.fetch_and_store(db)
    finally:
        db.close()

def check_streak_at_risk_job():
    db = SessionLocal()
    today = date.today()
    try:
        # Fetch users with active streak > 0 who haven't been active today
        at_risk_users = db.query(User).filter(
            User.streak_days > 0,
            (User.last_active_date < today) | (User.last_active_date == None)
        ).all()
        
        vapid_private = settings.vapid_private_key
        vapid_email = settings.vapid_claims_email
        
        for user in at_risk_users:
            subs = db.query(PushSubscription).filter(PushSubscription.user_id == user.id).all()
            for sub in subs:
                subscription_info = {
                    "endpoint": sub.endpoint,
                    "keys": {
                        "p256dh": sub.p256dh,
                        "auth": sub.auth
                    }
                }
                payload = {
                    "title": "Streak at Risk! 🔥",
                    "body": f"Hey {user.username or 'Learner'}, your active {user.streak_days}-day learning streak is at risk! Consolidate now to protect it.",
                    "tag": "streak-alert"
                }
                
                if vapid_private:
                    try:
                        webpush(
                            subscription_info=subscription_info,
                            data=json.dumps(payload),
                            vapid_private_key=vapid_private,
                            vapid_claims={"sub": vapid_email}
                        )
                        print(f"[scheduler] Dispatched streak reminder to user: {user.username}")
                    except WebPushException as ex:
                        print(f"[scheduler] Push failed for user {user.username}: {ex}")
                else:
                    print(f"[scheduler] VAPID keys missing. Mock dispatched streak alert for {user.username}.")
    except Exception as e:
        print(f"[scheduler] Error checking streak at risk: {e}")
    finally:
        db.close()

def memory_consolidation_digest_job():
    db = SessionLocal()
    today = date.today()
    tomorrow = today + timedelta(days=1)
    try:
        users = db.query(User).all()
        vapid_private = settings.vapid_private_key
        vapid_email = settings.vapid_claims_email
        
        for user in users:
            # Query count of upcoming reviews tomorrow
            due_tomorrow = db.query(UserCardStatus).filter(
                UserCardStatus.user_id == user.id,
                UserCardStatus.status == "completed",
                UserCardStatus.next_review_date <= tomorrow
            ).count()
            
            if due_tomorrow > 0:
                subs = db.query(PushSubscription).filter(PushSubscription.user_id == user.id).all()
                for sub in subs:
                    subscription_info = {
                        "endpoint": sub.endpoint,
                        "keys": {
                            "p256dh": sub.p256dh,
                            "auth": sub.auth
                        }
                    }
                    payload = {
                        "title": "Memory Consolidation Due Tomorrow 🧠",
                        "body": f"Hey {user.username or 'Learner'}, you have {due_tomorrow} card particles ready for review tomorrow. Keep up the active recall!",
                        "tag": "consolidation-reminder"
                    }
                    
                    if vapid_private:
                        try:
                            webpush(
                                subscription_info=subscription_info,
                                data=json.dumps(payload),
                                vapid_private_key=vapid_private,
                                vapid_claims={"sub": vapid_email}
                            )
                            print(f"[scheduler] Dispatched consolidation alert to user: {user.username}")
                        except WebPushException as ex:
                            print(f"[scheduler] Push failed for user {user.username}: {ex}")
                    else:
                        print(f"[scheduler] VAPID keys missing. Mock dispatched consolidation alert for {user.username}.")
    except Exception as e:
        print(f"[scheduler] Error preparing consolidation digest: {e}")
    finally:
        db.close()

# Ingest and news curation job runs every 24 hours
scheduler.add_job(fetch_news_job, 'interval', hours=24, id='fetch_news_job')

# Streak alert runs every day at 9 PM local time (21:00)
scheduler.add_job(check_streak_at_risk_job, 'cron', hour=21, minute=0, id='check_streak_at_risk_job')

# Consolidation digest runs every day at 10 PM local time (22:00)
scheduler.add_job(memory_consolidation_digest_job, 'cron', hour=22, minute=0, id='memory_consolidation_digest_job')
