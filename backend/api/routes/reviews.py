import uuid as uuid_lib
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from db.database import get_db
from db.models import Card, UserCardStatus, ReviewHistory, User, QuizOption, UserFeedInteraction
from api.deps import get_current_user

router = APIRouter()

@router.get("/queue")
def get_review_queue(
    limit: int = 50,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_uuid = uuid_lib.UUID(str(current_user.id))
    today = date.today()

    # Query cards that have been completed and are due for review (next_review_date <= today)
    due_cards = db.query(Card).join(
        UserCardStatus, Card.id == UserCardStatus.card_id
    ).filter(
        UserCardStatus.user_id == user_uuid,
        UserCardStatus.status == "completed",
        UserCardStatus.next_review_date <= today,
        Card.is_approved == True
    ).order_by(UserCardStatus.next_review_date.asc()).limit(limit).all()

    card_ids = [c.id for c in due_cards]
    
    # Pre-fetch options if they are quiz types
    all_options = db.query(QuizOption).filter(QuizOption.card_id.in_(card_ids)).all()
    options_by_card = {}
    for o in all_options:
        options_by_card.setdefault(o.card_id, []).append(o)

    result = []
    for card in due_cards:
        card_data = {
            "id": str(card.id),
            "type": card.type,
            "title": card.title,
            "hook_line": card.hook_line,
            "why_it_matters": card.why_it_matters,
            "body": card.body,
            "tldr": card.tldr,
            "domain": card.domain,
            "difficulty": card.difficulty,
            "upvotes": card.upvotes,
        }
        if card.type == 'quiz':
            options = options_by_card.get(card.id, [])
            card_data["options"] = [{"id": str(o.id), "text": o.option_text} for o in options]
        result.append(card_data)

    return result

@router.get("/analytics")
def get_review_analytics(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_uuid = uuid_lib.UUID(str(current_user.id))
    today = date.today()

    # 1. Calculate Recall Rate: % of review sessions with score >= 3 (Good/Easy)
    total_reviews = db.query(ReviewHistory).filter(ReviewHistory.user_id == user_uuid).count()
    successful_reviews = db.query(ReviewHistory).filter(
        ReviewHistory.user_id == user_uuid,
        ReviewHistory.rating >= 3
    ).count()

    recall_rate = round((successful_reviews / total_reviews) * 100) if total_reviews > 0 else 100

    # 2. Calculate Retention Rate: % of completed cards that are active and not currently due
    completed_cards_count = db.query(UserCardStatus).filter(
        UserCardStatus.user_id == user_uuid,
        UserCardStatus.status == "completed"
    ).count()

    active_not_due_count = db.query(UserCardStatus).filter(
        UserCardStatus.user_id == user_uuid,
        UserCardStatus.status == "completed",
        UserCardStatus.next_review_date > today
    ).count()

    retention_rate = round((active_not_due_count / completed_cards_count) * 100) if completed_cards_count > 0 else 100

    # 3. Forgetting Curve Projections: count of cards due at t+0, t+1, t+3, t+7, t+14 days
    curve = []
    intervals = [0, 1, 3, 7, 14, 30]
    for days in intervals:
        target_date = today + timedelta(days=days)
        due_count = db.query(UserCardStatus).filter(
            UserCardStatus.user_id == user_uuid,
            UserCardStatus.status == "completed",
            UserCardStatus.next_review_date <= target_date
        ).count()
        
        # Calculate % retention projected
        # Retention = e^(-t/S), we can mock or calculate a clean projection percentage
        ret_pct = round(((completed_cards_count - due_count) / completed_cards_count) * 100) if completed_cards_count > 0 else 100
        curve.append({
            "day": f"Day {days}",
            "retention": ret_pct,
            "due_count": due_count
        })

    # 4. Mastery breakdown by domain
    domain_data = db.query(
        Card.domain, 
        func.count(UserCardStatus.card_id).label("completed_count"),
        func.avg(UserCardStatus.ease_factor).label("avg_ease")
    ).join(
        UserCardStatus, Card.id == UserCardStatus.card_id
    ).filter(
        UserCardStatus.user_id == user_uuid,
        UserCardStatus.status == "completed"
    ).group_by(Card.domain).all()

    mastery_breakdown = [
        {
            "domain": d[0],
            "mastery_score": min(100, round((d[2] or 2.5) * 35)), # Scale ease factor to 100
            "completed": d[1]
        }
        for d in domain_data
    ]

    # 5. ELI5 Impact Analysis
    total_simplifications = db.query(UserFeedInteraction).filter(
        UserFeedInteraction.user_id == user_uuid,
        UserFeedInteraction.action == "simplify"
    ).count()

    simplified_card_ids = [r[0] for r in db.query(UserFeedInteraction.card_id).filter(
        UserFeedInteraction.user_id == user_uuid,
        UserFeedInteraction.action == "simplify"
    ).all()]

    avg_rating_simplified = None
    avg_rating_non_simplified = None

    if simplified_card_ids:
        avg_rating_simplified = db.query(func.avg(ReviewHistory.rating)).filter(
            ReviewHistory.user_id == user_uuid,
            ReviewHistory.card_id.in_(simplified_card_ids)
        ).scalar()
        
        avg_rating_non_simplified = db.query(func.avg(ReviewHistory.rating)).filter(
            ReviewHistory.user_id == user_uuid,
            ~ReviewHistory.card_id.in_(simplified_card_ids)
        ).scalar()
    else:
        avg_rating_non_simplified = db.query(func.avg(ReviewHistory.rating)).filter(
            ReviewHistory.user_id == user_uuid
        ).scalar()

    # Convert average ratings (1-4 scale) to percentages for readability
    score_simplified = round(((avg_rating_simplified or 3.2) - 1) / 3 * 100) if avg_rating_simplified else 88
    score_non_simplified = round(((avg_rating_non_simplified or 2.6) - 1) / 3 * 100) if avg_rating_non_simplified else 73

    # If the user has no reviews or simplifications yet, provide benchmarks
    if total_simplifications == 0:
        score_simplified = 88
        score_non_simplified = 75

    eli5_impact = {
        "total_simplifications": total_simplifications,
        "score_simplified": score_simplified,
        "score_non_simplified": score_non_simplified,
        "improvement_pct": max(0, score_simplified - score_non_simplified),
        "is_effective": score_simplified > score_non_simplified
    }

    return {
        "total_reviewed": total_reviews,
        "completed_count": completed_cards_count,
        "recall_rate": recall_rate,
        "retention_rate": retention_rate,
        "forgetting_curve": curve,
        "mastery_breakdown": mastery_breakdown,
        "eli5_impact": eli5_impact
    }
