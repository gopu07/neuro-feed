import uuid as uuid_lib
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import QuizOption, UserQuizAttempt, User, Card, UserXpTransaction
from api.deps import get_current_user, check_rate_limit
from api.routes.user import _update_weekly_leaderboard, _get_or_create_user
from sqlalchemy.sql.expression import func
from db.models import UserCardStatus

router = APIRouter()

class AnswerRequest(BaseModel):
    selected_option_id: str

@router.get("/feed")
def get_quiz_feed(
    domain: str = None,
    limit: int = 10,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_uuid = uuid_lib.UUID(str(current_user.id))

    # Filter out quizzes the user has already answered/seen
    seen_subquery = db.query(UserCardStatus.card_id).filter(
        UserCardStatus.user_id == user_uuid,
        UserCardStatus.status.in_(["seen", "completed"])
    )

    query = db.query(Card).filter(
        Card.type == 'quiz',
        Card.is_approved == True,
        Card.id.notin_(seen_subquery)
    )

    if domain and domain.lower() != 'all':
        query = query.filter(Card.domain == domain)

    cards = query.order_by(func.random()).limit(limit).all()

    result = []
    for card in cards:
        card_data = {
            "id": str(card.id),
            "type": card.type,
            "title": card.title,
            "hook_line": card.hook_line,
            "why_it_matters": card.why_it_matters,
            "body": card.body,
            "domain": card.domain,
            "difficulty": card.difficulty,
        }
        options = db.query(QuizOption).filter(QuizOption.card_id == card.id).all()
        card_data["options"] = [{"id": str(o.id), "text": o.option_text} for o in options]
        result.append(card_data)

    return result

@router.post("/{card_id}/answer")
def answer_quiz(
    card_id: str,
    req: AnswerRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    print(f"[quiz] card_id={card_id} option={req.selected_option_id} user={current_user.id}")

    # Enforce rate limiting: 5 attempts per minute per user
    check_rate_limit("quiz", limit=5, window_seconds=60, identifier=str(current_user.id))

    # Cast IDs to UUID objects for PostgreSQL
    try:
        card_uuid = uuid_lib.UUID(card_id)
        option_uuid = uuid_lib.UUID(req.selected_option_id)
        user_uuid = uuid_lib.UUID(str(current_user.id))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Invalid UUID: {e}")

    # 1. Validate option belongs to this card
    option = db.query(QuizOption).filter(
        QuizOption.id == option_uuid,
        QuizOption.card_id == card_uuid
    ).first()

    if not option:
        print(f"[quiz] Option not found. card_uuid={card_uuid} option_uuid={option_uuid}")
        # Debug: show all options for this card
        all_opts = db.query(QuizOption).filter(QuizOption.card_id == card_uuid).all()
        print(f"[quiz] Options for card: {[(str(o.id), o.option_text[:30]) for o in all_opts]}")
        raise HTTPException(status_code=404, detail="Quiz option not found for this card.")

    is_correct = option.is_correct
    explanation = option.explanation or "No explanation provided."

    # Check if the user has already answered this quiz correctly before
    already_correct = db.query(UserQuizAttempt).filter(
        UserQuizAttempt.user_id == user_uuid,
        UserQuizAttempt.card_id == card_uuid,
        UserQuizAttempt.is_correct == True
    ).first()

    if is_correct:
        if already_correct:
            xp_earned = 0
            print(f"[quiz] Duplicate correct answer detected for user {user_uuid} on card {card_uuid}. Awarding 0 XP.")
        else:
            xp_earned = 20
    else:
        xp_earned = 0

    # Ensure user exists in the database to prevent foreign key errors
    user = _get_or_create_user(current_user, db)

    # 2. Award XP if correct and not already answered correctly
    if is_correct and xp_earned > 0:
        # Server-side safe mutation
        user.xp = (user.xp or 0) + xp_earned
        
        # Update weekly leaderboard
        card = db.query(Card).filter(Card.id == card_uuid).first()
        domain = card.domain if card else None
        _update_weekly_leaderboard(db, user_uuid, xp_earned, domain)
        tx = UserXpTransaction(
            user_id=user_uuid,
            amount=xp_earned,
            reason="quiz_correct",
            reference_id=card_uuid
        )
        db.add(tx)

    try:
        # 3. Log attempt
        attempt = UserQuizAttempt(
            user_id=user_uuid,
            card_id=card_uuid,
            selected_option_id=option_uuid,
            is_correct=is_correct,
            xp_earned=xp_earned
        )
        db.add(attempt)
        
        from sqlalchemy.dialects.postgresql import insert
        stmt = insert(UserCardStatus).values(
            user_id=user_uuid,
            card_id=card_uuid,
            status='completed'
        ).on_conflict_do_update(
            index_elements=['user_id', 'card_id'],
            set_={'status': 'completed'}
        )
        db.execute(stmt)
        
        db.commit()
    except Exception:
        db.rollback()
        raise

    # Fetch the correct option ID for feedback
    correct_option = db.query(QuizOption).filter(
        QuizOption.card_id == card_uuid,
        QuizOption.is_correct == True
    ).first()
    correct_option_id = str(correct_option.id) if correct_option else None

    print(f"[quiz] Result: is_correct={is_correct} xp={xp_earned}")
    return {
        "is_correct": is_correct,
        "explanation": explanation,
        "xp_earned": xp_earned,
        "correct_option_id": correct_option_id
    }
