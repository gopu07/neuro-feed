from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from db.database import get_db
from db.models import User, LeaderboardWeekly
from api.deps import get_current_user
from datetime import date, timedelta
from typing import List, Optional

router = APIRouter()

@router.get("/")
def get_global_leaderboard(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get the global all-time leaderboard sorted by XP."""
    users = db.query(User).order_by(desc(User.xp)).offset(offset).limit(limit).all()
    
    results = []
    for rank, u in enumerate(users, start=offset + 1):
        results.append({
            "rank": rank,
            "user_id": str(u.id),
            "username": u.username or "Anonymous",
            "xp": u.xp,
            "streak_days": u.streak_days,
            "skill_level": u.skill_level
        })
    return results

@router.get("/me")
def get_my_leaderboard_rank(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get the current user's global rank."""
    import uuid as uuid_lib
    try:
        user_uuid = uuid_lib.UUID(str(current_user.id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
        
    # Fetch database User row
    db_user = db.query(User).filter(User.id == user_uuid).first()
    if not db_user:
        from api.routes.user import _get_or_create_user
        db_user = _get_or_create_user(current_user, db)
        
    # Count how many users have strictly more XP
    higher_ranked = db.query(User).filter(User.xp > (db_user.xp or 0)).count()
    my_rank = higher_ranked + 1
    
    return {
        "rank": my_rank,
        "user_id": str(db_user.id),
        "username": db_user.username or "Anonymous",
        "xp": db_user.xp or 0,
        "streak_days": db_user.streak_days or 0,
        "skill_level": db_user.skill_level or "beginner"
    }


@router.get("/weekly")
def get_weekly_leaderboard(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get the leaderboard for the current week."""
    # Assuming week starts on Monday
    today = date.today()
    start_of_week = today - timedelta(days=today.weekday())
    
    weekly_entries = db.query(LeaderboardWeekly, User).join(User).filter(
        LeaderboardWeekly.week_start == start_of_week
    ).order_by(desc(LeaderboardWeekly.xp_this_week)).offset(offset).limit(limit).all()
    
    results = []
    for rank, (lw, u) in enumerate(weekly_entries, start=offset + 1):
        results.append({
            "rank": rank,
            "user_id": str(u.id),
            "username": u.username or "Anonymous",
            "xp": lw.xp_this_week,
            "streak_days": u.streak_days,
            "skill_level": u.skill_level
        })
    return results
