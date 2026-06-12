from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import date, timedelta, datetime
import uuid as uuid_lib

from db.database import get_db
from db.models import User, UserCardStatus, Card, UserQuizAttempt, UserInteraction, LeaderboardWeekly, UserXpTransaction
from api.deps import get_current_user
from sqlalchemy import func, cast, Integer

router = APIRouter()


def _get_or_create_user(supabase_user, db: Session) -> User:
    """Fetch user row from DB, creating it if it doesn't exist yet."""
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    from sqlalchemy.exc import IntegrityError
    
    user_uuid = uuid_lib.UUID(str(supabase_user.id))
    
    # Fast path
    user = db.query(User).filter(User.id == user_uuid).first()
    if user:
        return user
        
    # Slow path with race condition protection
    stmt = pg_insert(User).values(
        id=user_uuid,
        email=supabase_user.email,
        username=supabase_user.user_metadata.get("username") or supabase_user.email.split("@")[0],
        xp=0,
        streak_days=0,
        streak_shield=False,
    ).on_conflict_do_nothing(index_elements=['id'])
    
    try:
        db.execute(stmt)
        db.commit()
    except IntegrityError:
        db.rollback()
        
    return db.query(User).filter(User.id == user_uuid).first()


def _compute_level(xp: int):
    # Defined thresholds:
    # Novice: 0-99 XP -> level index 0
    # Learner: 100-299 XP -> level index 1
    # Explorer: 300-699 XP -> level index 2
    # Practitioner: 700-1499 XP -> level index 3
    # Researcher: 1500-2999 XP -> level index 4
    # Expert: 3000+ XP -> level index 5
    if xp < 100:
        name, index, current_min, next_min = "Novice", 0, 0, 100
    elif xp < 300:
        name, index, current_min, next_min = "Learner", 1, 100, 300
    elif xp < 700:
        name, index, current_min, next_min = "Explorer", 2, 300, 700
    elif xp < 1500:
        name, index, current_min, next_min = "Practitioner", 3, 700, 1500
    elif xp < 3000:
        name, index, current_min, next_min = "Researcher", 4, 1500, 3000
    else:
        name, index, current_min, next_min = "Expert", 5, 3000, None

    xp_in_level = xp - current_min
    xp_for_next = (next_min - current_min) if next_min is not None else None

    return {
        "level_name": name,
        "level_index": index,
        "xp_in_level": xp_in_level,
        "xp_for_next": xp_for_next,
    }


def _update_weekly_leaderboard(db, user_uuid, xp_delta, domain):
    from datetime import date, timedelta
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    from sqlalchemy import func
    week_start = date.today() - timedelta(days=date.today().weekday())
    
    def upsert_leaderboard(dom):
        board = db.query(LeaderboardWeekly).filter(
            LeaderboardWeekly.user_id == user_uuid,
            LeaderboardWeekly.week_start == week_start,
            LeaderboardWeekly.domain == dom
        ).first()
        if board:
            board.xp_this_week = max(0, (board.xp_this_week or 0) + xp_delta)
        else:
            board = LeaderboardWeekly(
                user_id=user_uuid,
                week_start=week_start,
                domain=dom,
                xp_this_week=max(0, xp_delta)
            )
            db.add(board)

    upsert_leaderboard("Global")
    if domain and domain != "Global":
        upsert_leaderboard(domain)


class UserPreferences(BaseModel):
    skill_level: str
    domains: list[str]

@router.put("/user/preferences")
def update_user_preferences(
    prefs: UserPreferences,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = _get_or_create_user(current_user, db)
    user.skill_level = prefs.skill_level
    user.domains = prefs.domains
    db.commit()
    
    return {"success": True, "skill_level": user.skill_level, "domains": user.domains}

@router.get("/user/profile")
def get_user_profile(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_or_create_user(current_user, db)
    level_info = _compute_level(user.xp or 0)
    
    # Calculate cards completed and domain breakdown
    user_uuid = uuid_lib.UUID(str(current_user.id))
    
    # Get total cards per domain
    total_cards_query = db.query(Card.domain, func.count(Card.id).label("total")).group_by(Card.domain).all()
    total_by_domain = {row.domain: row.total for row in total_cards_query}
    
    completed_cards_query = (
        db.query(Card.domain, func.count(UserCardStatus.card_id).label("count"))
        .join(UserCardStatus, Card.id == UserCardStatus.card_id)
        .filter(
            UserCardStatus.user_id == user_uuid,
            UserCardStatus.status.in_(["seen", "completed"])
        )
        .group_by(Card.domain)
        .all()
    )
    
    domain_progress = {}
    for domain, total in total_by_domain.items():
        domain_progress[domain] = {"completed": 0, "total": total}
        
    cards_completed = 0
    for row in completed_cards_query:
        if row.domain in domain_progress:
            domain_progress[row.domain]["completed"] = row.count
            cards_completed += row.count
        else:
            domain_progress[row.domain] = {"completed": row.count, "total": row.count}
            cards_completed += row.count

    # Calculate quiz accuracy
    quiz_stats = db.query(
        func.count(UserQuizAttempt.id).label("total_attempts"),
        func.sum(cast(UserQuizAttempt.is_correct, Integer)).label("correct_attempts")
    ).filter(UserQuizAttempt.user_id == user_uuid).first()
    
    quiz_accuracy = 0.0
    if quiz_stats and quiz_stats.total_attempts and quiz_stats.total_attempts > 0:
        quiz_accuracy = round((quiz_stats.correct_attempts or 0) / quiz_stats.total_attempts * 100, 2)

    return {
        "xp": user.xp or 0,
        "streak_days": user.streak_days or 0,
        "streak_shield": user.streak_shield or False,
        "username": user.username or "",
        "domains": user.domains or [],
        "skill_level": user.skill_level or "beginner",
        "cards_completed": cards_completed,
        "quiz_accuracy": quiz_accuracy,
        "domain_progress": domain_progress,
        **level_info,
    }


@router.get("/user/xp-history")
def get_user_xp_history(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the user's historical XP grouped by day from user_xp_transactions."""
    user_uuid = uuid_lib.UUID(str(current_user.id))
    
    # Query transactions grouped by date (ignoring time)
    # We cast to Date to group by day
    history = db.query(
        func.date(UserXpTransaction.created_at).label("day_date"),
        func.sum(UserXpTransaction.amount).label("daily_xp")
    ).filter(
        UserXpTransaction.user_id == user_uuid
    ).group_by(
        func.date(UserXpTransaction.created_at)
    ).order_by(
        func.date(UserXpTransaction.created_at).asc()
    ).all()
    
    # Return as structured list for Recharts
    result = []
    accumulated_xp = 0
    for row in history:
        accumulated_xp += row.daily_xp
        result.append({
            "day": str(row.day_date),
            "xp": accumulated_xp
        })
        
    # If history is empty, return a default single data point
    if not result:
        user = db.query(User).filter(User.id == user_uuid).first()
        result.append({
            "day": str(date.today()),
            "xp": user.xp if user else 0
        })
        
    return result

@router.post("/user/purchase-shield")
def purchase_streak_shield(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_uuid = uuid_lib.UUID(str(current_user.id))
    
    # 1. Acquire write lock on user row
    user = db.query(User).filter(User.id == user_uuid).with_for_update().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.streak_shield:
        raise HTTPException(status_code=400, detail="You already have an active Streak Shield.")
        
    cost = 100
    if (user.xp or 0) < cost:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient XP. A Streak Shield costs {cost} XP. You have {user.xp} XP."
        )
        
    try:
        user.xp = (user.xp or 0) - cost
        user.streak_shield = True
        
        # Log XP transaction to ledger with negative value
        tx = UserXpTransaction(
            user_id=user_uuid,
            amount=-cost,
            reason="purchase_streak_shield"
        )
        db.add(tx)
        
        db.commit()
    except Exception:
        db.rollback()
        raise
        
    return {"success": True, "xp": user.xp, "streak_shield": user.streak_shield}


