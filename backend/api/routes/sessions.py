from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
import uuid as uuid_lib

from db.database import get_db
from db.models import LearningSession, UserXpTransaction, ReviewHistory, UserQuizAttempt
from api.deps import get_current_user
from pydantic import BaseModel

router = APIRouter()

class SessionEndRequest(BaseModel):
    # Keep request model intact to avoid breaking frontend contracts,
    # but we will calculate the verified counts server-side for safety.
    cards_reviewed: int
    xp_earned: int

@router.post("/start")
def start_session(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    user_uuid = uuid_lib.UUID(str(current_user.id))
    new_session = LearningSession(user_id=user_uuid)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return {"session_id": str(new_session.id), "started_at": new_session.started_at}

@router.post("/{session_id}/end")
def end_session(
    session_id: str, 
    payload: SessionEndRequest, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    user_uuid = uuid_lib.UUID(str(current_user.id))
    session_uuid = uuid_lib.UUID(session_id)
    
    db_session = db.query(LearningSession).filter(
        LearningSession.id == session_uuid, 
        LearningSession.user_id == user_uuid
    ).first()
    
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # SECURITY HARDENING: Do NOT trust client payloads. 
    # Calculate actual XP earned and cards reviewed server-side since the session started.
    actual_xp = db.query(func.sum(UserXpTransaction.amount)).filter(
        UserXpTransaction.user_id == user_uuid,
        UserXpTransaction.created_at >= db_session.started_at
    ).scalar() or 0
    
    actual_reviews = db.query(func.count(ReviewHistory.id)).filter(
        ReviewHistory.user_id == user_uuid,
        ReviewHistory.created_at >= db_session.started_at
    ).scalar() or 0
    
    actual_quizzes = db.query(func.count(UserQuizAttempt.id)).filter(
        UserQuizAttempt.user_id == user_uuid,
        UserQuizAttempt.created_at >= db_session.started_at
    ).scalar() or 0
    
    verified_cards = actual_reviews + actual_quizzes
    
    db_session.ended_at = func.now()
    db_session.cards_reviewed = verified_cards
    db_session.xp_earned = int(actual_xp)
    db.commit()
    db.refresh(db_session)
    
    print(f"[sessions] End session={session_uuid} verified_cards={verified_cards} verified_xp={actual_xp}")
    return {
        "session_id": str(db_session.id),
        "cards_reviewed": db_session.cards_reviewed,
        "xp_earned": db_session.xp_earned,
        "ended_at": db_session.ended_at
    }
