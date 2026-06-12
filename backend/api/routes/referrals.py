from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
import uuid as uuid_lib
from typing import List, Optional
from datetime import datetime

from db.database import get_db
from db.models import User, Referral, UserXpTransaction
from api.deps import get_current_user
from api.routes.user import _get_or_create_user, _update_weekly_leaderboard

router = APIRouter()

def _resolve_user(current_user, db: Session) -> User:
    try:
        user_uuid = uuid_lib.UUID(str(current_user.id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    db_user = db.query(User).filter(User.id == user_uuid).first()
    if not db_user:
        db_user = _get_or_create_user(current_user, db)
    return db_user

@router.get("/my")
def get_my_referrals(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieve the user's active referral code, completed conversions, and XP totals."""
    db_user = _resolve_user(current_user, db)
    
    # Check if a referral record already exists for this user as a referrer
    referral_code_record = db.query(Referral).filter(Referral.referrer_id == db_user.id).first()
    
    referral_code = ""
    if referral_code_record:
        referral_code = referral_code_record.referral_code
    else:
        # Generate code on the fly
        base = (db_user.username or "LEARNER").upper().replace(" ", "")
        suffix = uuid_lib.uuid4().hex[:4].upper()
        referral_code = f"NF-{base}-{suffix}"
        
        # Save placeholder referral template
        placeholder = Referral(
            referrer_id=db_user.id,
            referral_code=referral_code,
            status="pending"
        )
        db.add(placeholder)
        db.commit()
        
    # Get completed referrals
    completed = db.query(Referral, User).join(User, Referral.referred_id == User.id).filter(
        Referral.referrer_id == db_user.id,
        Referral.status == "completed"
    ).all()
    
    referral_list = []
    total_xp_earned = 0
    for ref, u in completed:
        total_xp_earned += (ref.xp_awarded or 0)
        referral_list.append({
            "username": u.username or "Anonymous Learner",
            "joined_at": ref.completed_at,
            "xp_awarded": ref.xp_awarded
        })
        
    # Check if this user was referred by someone else
    was_referred = db.query(Referral).filter(
        Referral.referred_id == db_user.id,
        Referral.status == "completed"
    ).first() is not None
    
    return {
        "referral_code": referral_code,
        "referrals_count": len(completed),
        "total_xp_earned": total_xp_earned,
        "completed_referrals": referral_list,
        "already_claimed": was_referred
    }

@router.post("/claim")
def claim_referral_code(
    code: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Enter a referral code to claim the referral XP bounty (50 XP to both parties)."""
    db_user = _resolve_user(current_user, db)
    
    code_clean = code.strip()
    if not code_clean:
        raise HTTPException(status_code=400, detail="Referral code cannot be blank")
        
    # Verify that the user hasn't already been referred
    existing_claim = db.query(Referral).filter(
        Referral.referred_id == db_user.id,
        Referral.status == "completed"
    ).first()
    if existing_claim:
        raise HTTPException(status_code=400, detail="You have already claimed a referral bonus")
        
    # Find the referral code template
    ref_template = db.query(Referral).filter(
        func.lower(Referral.referral_code) == func.lower(code_clean)
    ).first()
    if not ref_template:
        raise HTTPException(status_code=400, detail="Invalid referral code")
        
    # Check if users are referring themselves
    if ref_template.referrer_id == db_user.id:
        raise HTTPException(status_code=400, detail="You cannot refer yourself")
        
    # Lock both user records in order of UUID to prevent deadlocks
    user1_id = min(ref_template.referrer_id, db_user.id)
    user2_id = max(ref_template.referrer_id, db_user.id)
    
    db.query(User).filter(User.id == user1_id).with_for_update().first()
    db.query(User).filter(User.id == user2_id).with_for_update().first()
    
    referrer = db.query(User).filter(User.id == ref_template.referrer_id).first()
    if not referrer:
        raise HTTPException(status_code=404, detail="Referrer account no longer exists")
        
    try:
        # Create completed referral transaction record
        new_referral = Referral(
            referrer_id=referrer.id,
            referred_id=db_user.id,
            referral_code=ref_template.referral_code,
            status="completed",
            xp_awarded=50,
            completed_at=datetime.utcnow()
        )
        db.add(new_referral)
        
        # Award 50 XP to both
        referrer.xp = (referrer.xp or 0) + 50
        db_user.xp = (db_user.xp or 0) + 50
        
        # Register XP transactions
        tx_referrer = UserXpTransaction(
            user_id=referrer.id,
            amount=50,
            reason="referral_invite"
        )
        tx_referred = UserXpTransaction(
            user_id=db_user.id,
            amount=50,
            reason="referral_signup"
        )
        db.add(tx_referrer)
        db.add(tx_referred)
        
        # Update weekly leaderboard scores
        _update_weekly_leaderboard(db, referrer.id, 50, "Global")
        _update_weekly_leaderboard(db, db_user.id, 50, "Global")
        
        db.commit()
    except Exception:
        db.rollback()
        raise
        
    return {
        "success": True,
        "message": "Referral code claimed! 50 XP has been added to your profile.",
        "xp": db_user.xp
    }
