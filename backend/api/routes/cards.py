from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import date, timedelta
import uuid as uuid_lib
from config import settings
import groq

from db.database import get_db
from db.models import Card, UserInteraction, UserCardStatus, User, CardComment, QuizOption, UserXpTransaction, ReviewHistory, UserFeedInteraction
from api.deps import get_current_user, check_rate_limit
from api.routes.user import _update_weekly_leaderboard, _get_or_create_user
from fastapi import HTTPException
from sqlalchemy import func

router = APIRouter()

def _get_groq_client():
    api_key = settings.groq_api_key or settings.groq_news_api_key
    if api_key:
        try:
            return groq.Groq(api_key=api_key)
        except Exception as e:
            print(f"Error initializing Groq: {e}")
    return None



class InteractRequest(BaseModel):
    action: str
    dwell_seconds: int = 0


def _apply_streak_and_xp(user: User, action: str, already_saved: bool = False) -> int:
    """
    Handle streak logic and XP awards for a given action.
    Returns xp_delta earned this interaction.
    """
    xp_delta = 0

    if action == "save":
        if not already_saved:
            xp_delta = 3

    user.xp = (user.xp or 0) + xp_delta
    return xp_delta


@router.post("/cards/{card_id}/interact")
def interact_with_card(
    card_id: str,
    req: InteractRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid_lib.UUID(str(current_user.id))
    card_uuid = uuid_lib.UUID(card_id)

    # Enforce rate limiting: 15 saves/interactions per minute
    check_rate_limit("interact", limit=15, window_seconds=60, identifier=str(current_user.id))

    # Ensure user row exists and handle race condition
    user = _get_or_create_user(current_user, db)

    # Check if a save interaction has already been logged to prevent XP farming
    already_saved = False
    if req.action == "save":
        already_saved = db.query(UserInteraction).filter(
            UserInteraction.user_id == user_uuid,
            UserInteraction.card_id == card_uuid,
            UserInteraction.action == "save"
        ).first() is not None

    xp_delta = _apply_streak_and_xp(user, req.action, already_saved=already_saved)

    interaction = db.query(UserInteraction).filter(
        UserInteraction.user_id == user_uuid,
        UserInteraction.card_id == card_uuid,
        UserInteraction.action == req.action
    ).first()

    try:
        if interaction:
            interaction.dwell_seconds = max(interaction.dwell_seconds or 0, req.dwell_seconds)
        else:
            interaction = UserInteraction(
                user_id=user_uuid,
                card_id=card_uuid,
                action=req.action,
                dwell_seconds=req.dwell_seconds
            )
            db.add(interaction)
    
        card = db.query(Card).filter(Card.id == card_uuid).first()
            
        if xp_delta > 0:
            domain = card.domain if card else None
            _update_weekly_leaderboard(db, user_uuid, xp_delta, domain)
            tx = UserXpTransaction(
                user_id=user_uuid,
                amount=xp_delta,
                reason="save",
                reference_id=card_uuid
            )
            db.add(tx)
    
        from sqlalchemy.dialects.postgresql import insert as pg_insert
        stmt = pg_insert(UserCardStatus).values(
            user_id=user_uuid,
            card_id=card_uuid,
            status="seen"
        ).on_conflict_do_update(
            index_elements=['user_id', 'card_id'],
            set_=dict(status="seen")
        )
        db.execute(stmt)
    
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "success": True,
        "xp_earned": xp_delta,
        "streak_days": user.streak_days,
        "total_xp": user.xp,
    }

@router.get("/cards/{card_id}")
def get_card(
    card_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        card_uuid = uuid_lib.UUID(card_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid card ID format")

    card = db.query(Card).filter(Card.id == card_uuid).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    comments = db.query(CardComment).filter(CardComment.card_id == card_uuid).order_by(CardComment.created_at.desc()).limit(5).all()
    
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
        "source_url": card.source_url,
        "comments": [
            {"id": str(c.id), "type": c.type, "content": c.content, "upvotes": c.upvotes}
            for c in comments
        ]
    }

    if card.type == 'quiz':
        options = db.query(QuizOption).filter(QuizOption.card_id == card.id).all()
        card_data["options"] = [{"id": str(o.id), "text": o.option_text} for o in options]

    return card_data

@router.post("/cards/{card_id}/simplify")
def simplify_card_content(
    card_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Enforce rate limiting: 10 simplifications per minute
    check_rate_limit("simplify", limit=10, window_seconds=60, identifier=str(current_user.id))
    try:
        card_uuid = uuid_lib.UUID(card_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid card ID format")

    card = db.query(Card).filter(Card.id == card_uuid).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    body_text = card.body
    fallback_simplified = card.tldr or "This update introduces a new breakthrough in AI that improves performance and reduces computation cost."

    simplified_text = None
    client = _get_groq_client()
    if client:
        try:
            prompt = (
                f"Explain the following AI/ML update in extremely simple, intuitive layman terms (ELI5 style) "
                f"for a beginner student. Avoid technical jargon or explain it immediately. Keep it to 2-3 sentences. "
                f"Focus on the 'why it matters' intuition. Do not use markdown headers, just plain text.\n\n"
                f"Title: {card.title}\n"
                f"Content: {body_text}"
            )
            chat_completion = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.7,
                max_tokens=200
            )
            simplified_text = chat_completion.choices[0].message.content.strip()
        except Exception as e:
            print(f"Groq simplify call failed: {e}")

    if not simplified_text:
        # Fallback to extracting the summary part of the body
        summary_part = body_text.split("💡 **Why it matters:**")[0].strip()
        simplified_text = summary_part or fallback_simplified

    # Log interaction in user_feed_interactions table
    try:
        feed_inter = UserFeedInteraction(
            user_id=uuid_lib.UUID(str(current_user.id)),
            card_id=card_uuid,
            action="simplify"
        )
        db.add(feed_inter)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[cards] Failed to log simplify interaction: {e}")

    return {"simplified": simplified_text}

@router.post("/cards/{card_id}/deepdive")
def deepdive_card_content(
    card_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Enforce rate limiting: 10 deepdives per minute
    check_rate_limit("deepdive", limit=10, window_seconds=60, identifier=str(current_user.id))
    try:
        card_uuid = uuid_lib.UUID(card_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid card ID format")

    card = db.query(Card).filter(Card.id == card_uuid).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    body_text = card.body

    bullets = []
    client = _get_groq_client()
    if client:
        try:
            prompt = (
                f"You are a Senior ML Research Scientist. Generate a brief, high-fidelity technical deep-dive "
                f"for the following AI/ML update. Highlight 3 bullet points with architectural, algorithmic, "
                f"or engineering insights (e.g. attention mechanics, training objectives, dataset scale, or latency benchmarks). "
                f"Keep each bullet point to a single concise sentence. Use backticks `like this` for technical terms. "
                f"Do NOT output markdown headers, just the 3 bullet points starting with '•'.\n\n"
                f"Title: {card.title}\n"
                f"Content: {body_text}"
            )
            chat_completion = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.7,
                max_tokens=250
            )
            deepdive_text = chat_completion.choices[0].message.content.strip()
            bullets = [b.replace("•", "").strip() for b in deepdive_text.split("\n") if b.strip()]
            bullets = [b for b in bullets if b]
        except Exception as e:
            print(f"Groq deepdive call failed: {e}")

    if not bullets or len(bullets) < 2:
        # Fallback to extracting the bullet points from the body
        takeaways = []
        if "🎯 **Key Takeaways:**" in body_text:
            takeaways_part = body_text.split("🎯 **Key Takeaways:**")[1]
            footer_marker = "⏱️ *Read time:"
            if footer_marker in takeaways_part:
                takeaways_part = takeaways_part.split(footer_marker)[0]
            lines = [l.strip() for l in takeaways_part.split("\n") if l.strip()]
            for line in lines:
                if line.startswith("•") or line.startswith("-"):
                    takeaways.append(line.replace("•", "").replace("-", "").strip())
        
        if not takeaways:
            takeaways = [
                f"Based on `{card.domain}` core concepts, this model optimization utilizes advanced architectural enhancements to improve accuracy.",
                "Optimizes computation path and reduces active parameters during inference.",
                "Scales training efficiency with robust hardware alignment and state-of-the-art loss criteria."
            ]
        bullets = takeaways[:3]

    # Log interaction in user_feed_interactions table
    try:
        feed_inter = UserFeedInteraction(
            user_id=uuid_lib.UUID(str(current_user.id)),
            card_id=card_uuid,
            action="deepdive"
        )
        db.add(feed_inter)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[cards] Failed to log deepdive interaction: {e}")

    return {"deepdive": bullets}

@router.post("/cards/{card_id}/unsave")
def unsave_card(
    card_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        card_uuid = uuid_lib.UUID(card_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid card ID format")

    user_uuid = uuid_lib.UUID(str(current_user.id))

    # Delete any "save" rows from UserInteraction to clean the DB and allow proper saves toggle
    save_interactions = db.query(UserInteraction).filter(
        UserInteraction.user_id == user_uuid,
        UserInteraction.card_id == card_uuid,
        UserInteraction.action == "save"
    ).all()

    try:
        if save_interactions:
            db.query(UserInteraction).filter(
                UserInteraction.user_id == user_uuid,
                UserInteraction.card_id == card_uuid,
                UserInteraction.action == "save"
            ).delete(synchronize_session=False)
    
            # Deduct XP only if they actually had saved it previously
            user = db.query(User).filter(User.id == user_uuid).first()
            if user:
                user.xp = max(0, (user.xp or 0) - 3)
                # Update weekly leaderboard with -3 XP
                card = db.query(Card).filter(Card.id == card_uuid).first()
                domain = card.domain if card else None
                _update_weekly_leaderboard(db, user_uuid, -3, domain)
                tx = UserXpTransaction(
                    user_id=user_uuid,
                    amount=-3,
                    reason="unsave",
                    reference_id=card_uuid
                )
                db.add(tx)
    
        from sqlalchemy.dialects.postgresql import insert as pg_insert
        stmt = pg_insert(UserCardStatus).values(
            user_id=user_uuid,
            card_id=card_uuid,
            status="unseen"
        ).on_conflict_do_update(
            index_elements=['user_id', 'card_id'],
            set_=dict(status="unseen")
        )
        db.execute(stmt)
            
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {"success": True}

class ConfidenceRequest(BaseModel):
    rating: int  # 1 to 4

@router.post("/cards/{card_id}/confidence")
def submit_confidence(
    card_id: str,
    req: ConfidenceRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    from api.services.spaced_repetition import SM2State, compute_next_review, compute_xp_award

    try:
        card_uuid = uuid_lib.UUID(card_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid card ID format")

    user_uuid = uuid_lib.UUID(str(current_user.id))

    status = db.query(UserCardStatus).filter(
        UserCardStatus.user_id == user_uuid,
        UserCardStatus.card_id == card_uuid,
    ).first()

    is_first_completion = (not status) or (status.status != "completed")

    rating = req.rating

    # --- Delegate SM-2 math to service layer ---
    current_state = SM2State(
        repetitions=status.repetitions if status else 0,
        interval_days=status.interval_days if status else 0,
        ease_factor=status.ease_factor if status else 2.5,
    ) if status else None

    sm2 = compute_next_review(rating, current_state)

    from sqlalchemy.dialects.postgresql import insert as pg_insert
    stmt = pg_insert(UserCardStatus).values(
        user_id=user_uuid,
        card_id=card_uuid,
        status="completed",
        ease_factor=sm2.ease_factor,
        interval_days=sm2.interval_days,
        repetitions=sm2.repetitions,
        next_review_date=sm2.next_review_date,
    ).on_conflict_do_update(
        index_elements=['user_id', 'card_id'],
        set_=dict(
            status="completed",
            ease_factor=sm2.ease_factor,
            interval_days=sm2.interval_days,
            repetitions=sm2.repetitions,
            next_review_date=sm2.next_review_date,
        )
    )
    db.execute(stmt)

    xp_earned = 0
    if is_first_completion:
        card = db.query(Card).filter(Card.id == card_uuid).first()
        difficulty = card.difficulty if card and card.difficulty else 'beginner'

        user = db.query(User).filter(User.id == user_uuid).first()
        streak = user.streak_days if user else 0

        # --- Delegate XP computation to service layer ---
        xp_earned = compute_xp_award(rating, difficulty, streak_days=streak)

        if user:
            user.xp = (user.xp or 0) + xp_earned
            db.add(user)

            domain = card.domain if card else None
            _update_weekly_leaderboard(db, user_uuid, xp_earned, domain)
            tx = UserXpTransaction(
                user_id=user_uuid,
                amount=xp_earned,
                reason="spaced_rep_review",
                reference_id=card_uuid
            )
            db.add(tx)

    # Record to review history log
    rh = ReviewHistory(
        user_id=user_uuid,
        card_id=card_uuid,
        rating=rating,
        ease_factor=sm2.ease_factor,
        interval_days=sm2.interval_days,
        repetitions=sm2.repetitions,
        review_date=date.today()
    )
    db.add(rh)

    db.commit()

    return {
        "success": True,
        "next_review_date": sm2.next_review_date,
        "interval_days": sm2.interval_days,
        "xp_earned": xp_earned
    }
