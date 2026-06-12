from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, func
from db.database import get_db
from db.models import Card
from api.deps import get_current_user
from typing import List, Optional

router = APIRouter()

@router.get("/")
def get_explore_feed(
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get general explore feed, optionally filtered by category/domain."""
    query = db.query(Card).filter(Card.is_approved == True)
    
    if category:
        query = query.filter(func.lower(Card.domain) == category.lower())
        
    cards = query.order_by(desc(Card.created_at)).offset(offset).limit(limit).all()
    return cards

@router.get("/search")
def search_content(
    q: str = Query(..., min_length=2, max_length=100),
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Search cards by title, body, or tldr."""
    search_term = f"%{q}%"
    
    query = db.query(Card).filter(
        Card.is_approved == True,
        or_(
            Card.title.ilike(search_term),
            Card.body.ilike(search_term),
            Card.tldr.ilike(search_term)
        )
    )
    
    cards = query.order_by(desc(Card.created_at)).offset(offset).limit(limit).all()
    return cards

@router.get("/trending")
def get_trending_content(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Get trending content based on upvotes."""
    query = db.query(Card).filter(Card.is_approved == True)
    cards = query.order_by(desc(Card.upvotes)).limit(limit).all()
    return cards

@router.get("/social-proof")
def get_social_proof_widgets(
    db: Session = Depends(get_db)
):
    """Retrieve dynamic aggregated social proofs of developers active today, completions, and trending domains."""
    from datetime import date
    from db.models import User, UserCardStatus
    
    today = date.today()
    
    # Dynamic active today counts + realistic seed baseline
    active_today = db.query(User).filter(User.last_active_date == today).count()
    active_count = active_today + 147
    
    # Completed cards today + baseline
    completions_today = db.query(UserCardStatus).filter(
        UserCardStatus.status == "completed",
        UserCardStatus.next_review_date > today # completed concepts scheduled for review
    ).count()
    completions_count = completions_today + 382
    
    # Calculate trending domain dynamically
    trending_domain_row = db.query(
        Card.domain, 
        func.count(UserCardStatus.card_id).label("cnt")
    ).join(UserCardStatus, Card.id == UserCardStatus.card_id)\
     .group_by(Card.domain)\
     .order_by(desc("cnt"))\
     .first()
     
    trending_domain = trending_domain_row[0] if trending_domain_row else "LLM Engineering"
    
    return {
        "active_today": active_count,
        "completions_today": completions_count,
        "trending_domain": trending_domain,
        "popularity_tagline": f"Trending in {trending_domain}"
    }

@router.get("/activity-feed")
def get_recent_activity_feed(
    limit: int = Query(10, ge=1, le=30),
    db: Session = Depends(get_db)
):
    """Generate a live, chronological social activity feed from active learning logs."""
    from db.models import UserXpTransaction, User, Card
    
    # Fetch recent transactions with usernames
    records = db.query(UserXpTransaction, User).join(
        User, UserXpTransaction.user_id == User.id
    ).order_by(desc(UserXpTransaction.created_at)).limit(limit).all()
    
    feed = []
    for tx, user in records:
        username = user.username or "Anonymous Learner"
        amount = tx.amount
        reason = tx.reason
        
        # Format human-friendly descriptions based on real transaction ledger records
        if reason == "referral_invite":
            msg = f"{username} referred a friend and earned a +50 XP bounty! 🎁"
        elif reason == "referral_signup":
            msg = f"{username} signed up using an invite link! (+50 XP) ⚡"
        elif reason == "spaced_rep_review":
            msg = f"{username} consolidated an ML concept particle! (+{amount} XP) 🧠"
        elif reason == "daily_challenge":
            msg = f"{username} conquered today's Daily Challenge! (+100 XP) 🔥"
        elif reason == "quiz_correct":
            msg = f"{username} answered the concept verification quiz correctly! (+{amount} XP) ✅"
        elif reason == "purchase_streak_shield":
            msg = f"{username} equipped a Streak Shield in the XP store! 🛡️"
        elif amount > 0:
            msg = f"{username} earned +{amount} XP for active learning! ⚡"
        else:
            msg = f"{username} spent {abs(amount)} XP in the Streak freeze store! 🛡️"
            
        feed.append({
            "id": str(tx.id),
            "user_id": str(user.id),
            "username": username,
            "message": msg,
            "created_at": tx.created_at
        })
        
    # Return simulated fallbacks if database is brand new and records is empty
    if not feed:
        feed = [
            {"id": "f1", "username": "AlphaDev", "message": "AlphaDev reached a 7-day Streak milestone! 🔥", "created_at": "Just now"},
            {"id": "f2", "username": "BetaScientist", "message": "BetaScientist completed the quiz on Transformers! (+25 XP) ✅", "created_at": "2 mins ago"},
            {"id": "f3", "username": "LearnerX", "message": "LearnerX consolidated an ML concept particle! (+15 XP) 🧠", "created_at": "5 mins ago"}
        ]
        
    return feed
