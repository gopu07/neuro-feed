from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from config import settings
import json
from pywebpush import webpush, WebPushException

from db.database import get_db
from db.models import PushSubscription
from api.deps import get_current_user

router = APIRouter()

class KeysModel(BaseModel):
    p256dh: str
    auth: str

class SubscriptionModel(BaseModel):
    endpoint: str
    keys: KeysModel

@router.post("/subscribe")
def subscribe(
    subscription: SubscriptionModel,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    existing = db.query(PushSubscription).filter(
        PushSubscription.user_id == current_user.id,
        PushSubscription.endpoint == subscription.endpoint
    ).first()

    if existing:
        existing.p256dh = subscription.keys.p256dh
        existing.auth = subscription.keys.auth
    else:
        new_sub = PushSubscription(
            user_id=current_user.id,
            endpoint=subscription.endpoint,
            p256dh=subscription.keys.p256dh,
            auth=subscription.keys.auth
        )
        db.add(new_sub)
    
    db.commit()
    return {"success": True}

@router.post("/test")
def test_notification(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    sub = db.query(PushSubscription).filter(PushSubscription.user_id == current_user.id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="No subscription found")
        
    subscription_info = {
        "endpoint": sub.endpoint,
        "keys": {
            "p256dh": sub.p256dh,
            "auth": sub.auth
        }
    }
    
    vapid_private_key = settings.vapid_private_key
    vapid_claims = {"sub": settings.vapid_claims_email}
    
    if not vapid_private_key:
        raise HTTPException(status_code=500, detail="Server VAPID keys not configured")
        
    try:
        webpush(
            subscription_info=subscription_info,
            data=json.dumps({"title": "NeuroFeed", "body": "This is a test notification."}),
            vapid_private_key=vapid_private_key,
            vapid_claims=vapid_claims
        )
        return {"success": True}
    except WebPushException as ex:
        print("WebPush Error:", repr(ex))
        raise HTTPException(status_code=500, detail="Push failed")
