import os
import json
import logging
import traceback
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import func
from upstash_redis import Redis

from db.database import SessionLocal, get_db
from db.models import Card, CardComment, QuizOption, User, UserCardStatus, UserInteraction
from api.deps import get_current_user
import uuid as uuid_lib
from datetime import date, datetime

router = APIRouter()

# Initialize Upstash Redis client
redis_client = Redis(
    url=os.getenv("UPSTASH_REDIS_URL"),
    token=os.getenv("UPSTASH_REDIS_TOKEN")
)

# Comment generation removed as per user request

@router.get("/feed")
def get_feed(
    background_tasks: BackgroundTasks,
    limit: int = 50,
    offset: int = 0,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        user_uuid = uuid_lib.UUID(str(current_user.id))
        user = db.query(User).filter(User.id == user_uuid).first()

        query = db.query(Card).filter(Card.is_approved == True, Card.type != 'quiz')
        
        if user and user.domains:
            allowed_domains = user.domains + ["Industry"]
            query = query.filter(Card.domain.in_(allowed_domains))
            
        if user and user.skill_level:
            # Include beginner by default as foundational
            query = query.filter(Card.difficulty.in_([user.skill_level, "beginner"]))

        # Fetch all candidate cards
        candidates_query = db.query(Card).filter(Card.is_approved == True, Card.type != 'quiz')
        
        # Pull seen and completed statuses to score them correctly
        all_statuses = db.query(UserCardStatus).filter(UserCardStatus.user_id == user_uuid).all()
        status_map = {s.card_id: s for s in all_statuses}
        
        today = date.today()
        
        scored_cards = []
        for card in candidates_query.all():
            score = 0.0
            card_status = status_map.get(card.id)
            
            # 1. Base Score depending on spacing / seen state
            if card_status:
                if card_status.status == "completed" and card_status.next_review_date <= today:
                    score += 100.0  # High priority: Spaced repetition due reviews
                elif card_status.status in ["seen", "completed"]:
                    score += 10.0   # Seen fallback cards
                else:
                    score += 50.0   # Unseen cards
            else:
                score += 50.0       # Fresh unseen cards
                
            # 2. Domain Match Boost
            if user and user.domains and card.domain in user.domains:
                score += 30.0
                
            # 3. Difficulty Match Boost
            if user and user.skill_level:
                if card.difficulty == user.skill_level:
                    score += 20.0
                elif card.difficulty == "beginner":
                    score += 10.0  # Beginner cards get partial boost as baseline
                    
            # 4. Freshness Boost (newer cards get slightly higher weight)
            if card.created_at:
                days_old = (datetime.now().date() - card.created_at.date()).days
                score += max(0, 10 - (days_old * 0.1))
                
            # 5. Randomized Exploration Boost (adds novelty and keeps it dynamic)
            import random
            score += random.uniform(0, 15)
            
            scored_cards.append((score, card))
            
        # Sort cards descending by their computed personalization score
        scored_cards.sort(key=lambda x: x[0], reverse=True)
        
        # Apply pagination (offset & limit)
        paginated_scored = scored_cards[offset:offset+limit]
        cards = [sc[1] for sc in paginated_scored]
        
        # Explicitly ensure news cards are present in the final list for variety
        has_news = any(c.type == 'news' for c in cards)
        if not has_news:
            news_query = db.query(Card).filter(
                Card.type == 'news', 
                Card.is_approved == True
            )
            # Find a news card that wasn't included
            included_ids = {c.id for c in cards}
            missing_news = [c for c in news_query.all() if c.id not in included_ids]
            if missing_news:
                # Inject news card at index 1
                if len(cards) > 1:
                    cards.insert(1, missing_news[0])
                    if len(cards) > limit:
                        cards.pop()
                else:
                    cards.append(missing_news[0])

        card_ids = [c.id for c in cards]
        
        all_comments = db.query(CardComment).filter(CardComment.card_id.in_(card_ids)).all()
        comments_by_card = {}
        for c in all_comments:
            comments_by_card.setdefault(c.card_id, []).append(c)
        for c_id in comments_by_card:
            comments_by_card[c_id].sort(key=lambda x: x.created_at if x.created_at else date.today(), reverse=True)
            comments_by_card[c_id] = comments_by_card[c_id][:5]

        all_statuses = db.query(UserCardStatus).filter(
            UserCardStatus.user_id == user_uuid,
            UserCardStatus.card_id.in_(card_ids)
        ).all()
        status_by_card = {s.card_id: s for s in all_statuses}

        all_options = db.query(QuizOption).filter(QuizOption.card_id.in_(card_ids)).all()
        options_by_card = {}
        for o in all_options:
            options_by_card.setdefault(o.card_id, []).append(o)

        result = []
        for card in cards:
            comments = comments_by_card.get(card.id, [])
            card_status = status_by_card.get(card.id)

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
                "next_review_date": str(card_status.next_review_date) if card_status and card_status.next_review_date else None,
                "is_review": bool(card_status and card_status.next_review_date and card_status.next_review_date <= today),
                "comments": [
                    {"id": str(c.id), "type": c.type, "content": c.content, "upvotes": c.upvotes}
                    for c in comments
                ]
            }

            if card.type == 'quiz':
                options = options_by_card.get(card.id, [])
                card_data["options"] = [{"id": str(o.id), "text": o.option_text} for o in options]

            result.append(card_data)

        if not result:
            return {"items": [], "hasMore": False}
        return {"items": result, "hasMore": len(result) >= limit}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Feed generation failed: {str(e)}")

@router.get("/feed/completed")
def get_completed_feed(
    domain: str = None,
    limit: int = 50,
    offset: int = 0,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_uuid = uuid_lib.UUID(str(current_user.id))

    query = db.query(Card).join(
        UserCardStatus, Card.id == UserCardStatus.card_id
    ).filter(
        UserCardStatus.user_id == user_uuid,
        UserCardStatus.status.in_(["seen", "completed"]),
        Card.type != 'quiz'
    )

    if domain and domain.lower() not in ["all", "archive"]:
        query = query.filter(Card.domain == domain)

    # Order by most recently seen (we could use UserCardStatus updated_at if we had it, fallback to Card creation or random)
    cards = query.order_by(Card.created_at.desc()).offset(offset).limit(limit).all()

    card_ids = [c.id for c in cards]
    
    all_comments = db.query(CardComment).filter(CardComment.card_id.in_(card_ids)).all()
    comments_by_card = {}
    for c in all_comments:
        comments_by_card.setdefault(c.card_id, []).append(c)
    for c_id in comments_by_card:
        comments_by_card[c_id].sort(key=lambda x: x.created_at if x.created_at else date.today(), reverse=True)
        comments_by_card[c_id] = comments_by_card[c_id][:5]

    all_options = db.query(QuizOption).filter(QuizOption.card_id.in_(card_ids)).all()
    options_by_card = {}
    for o in all_options:
        options_by_card.setdefault(o.card_id, []).append(o)

    result = []
    for card in cards:
        comments = comments_by_card.get(card.id, [])

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
            "comments": [
                {"id": str(c.id), "type": c.type, "content": c.content, "upvotes": c.upvotes}
                for c in comments
            ]
        }

        if card.type == 'quiz':
            options = options_by_card.get(card.id, [])
            card_data["options"] = [{"id": str(o.id), "text": o.option_text} for o in options]

        result.append(card_data)

    return result
