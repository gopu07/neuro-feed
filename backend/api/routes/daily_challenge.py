from config import settings
import json
from datetime import date
import uuid as uuid_lib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import groq

from db.database import get_db
from db.models import Card, QuizOption, DailyChallenge, DailyChallengeCompletion, User, UserInteraction, UserXpTransaction, UserActivityEvent, UserCardStatus
from api.deps import get_current_user
from api.routes.user import _get_or_create_user, _update_weekly_leaderboard

router = APIRouter()

def _get_groq_client():
    api_key = settings.groq_daily_challenge_api_key
    if api_key:
        try:
            return groq.Groq(api_key=api_key)
        except Exception as e:
            print(f"Error initializing Groq: {e}")
    return None

MOCK_DAILY_CARDS = [
    {
        "type": "concept",
        "title": "Understanding RAG (Retrieval-Augmented Generation)",
        "body": "Retrieval-Augmented Generation (RAG) is a technique that enhances Large Language Models (LLMs) by fetching relevant data from external knowledge sources (like vector databases) before generating a response. This significantly reduces hallucinations, ensures access to up-to-date or proprietary information, and allows for source citation.",
        "tldr": "RAG improves LLM accuracy by retrieving external context before response generation.",
        "domain": "RAG",
        "difficulty": "beginner"
    },
    {
        "type": "concept",
        "title": "Vector Embeddings & Cosine Similarity",
        "body": "Vector embeddings represent text as high-dimensional mathematical vectors, capturing semantic meaning rather than just keywords. Cosine similarity calculates the cosine of the angle between two vectors, measuring how close their meanings are. This enables semantic search engines to find relevant passages even without keyword overlaps.",
        "tldr": "Embeddings represent meanings mathematically, compared using cosine similarity.",
        "domain": "Fundamentals",
        "difficulty": "beginner"
    },
    {
        "type": "news",
        "title": "Meta Releases Llama 3.3 70B",
        "body": "Meta has officially released Llama 3.3 70B, showcasing state-of-the-art capabilities in text generation, reasoning, and coding benchmarks. The model provides comparable performance to much larger closed-source offerings while remaining highly efficient to run and fine-tune for custom enterprise workflows.",
        "tldr": "Meta releases highly efficient Llama 3.3 70B with state-of-the-art open capabilities.",
        "domain": "NLP",
        "difficulty": "intermediate"
    },
    {
        "type": "concept",
        "title": "Agentic Workflows vs Single Prompts",
        "body": "Traditional prompt engineering relies on single-shot LLM requests. Agentic workflows, however, allow LLMs to run in a loop, self-correcting their work, planning multi-step actions, and executing external tools (e.g. database querying, web browsing) to achieve complex goals autonomously over multiple iterations.",
        "tldr": "Agentic workflows use iterative planning and external tools for complex goals.",
        "domain": "Agents",
        "difficulty": "intermediate"
    },
    {
        "type": "news",
        "title": "DeepSeek-V3 Redefines Open-Source Benchmarks",
        "body": "DeepSeek open-sources DeepSeek-V3, a massive Mixture-of-Experts (MoE) language model utilizing advanced Multi-head Latent Attention (MLA) and DualPipe training pipelines. DeepSeek-V3 delivers extreme speedups and equals GPT-4o benchmarks at a fraction of standard GPU cost, disrupting the LLM landscape.",
        "tldr": "DeepSeek-V3 achieves GPT-4o performance using open MoE architecture and latency optimizations.",
        "domain": "NLP",
        "difficulty": "advanced"
    },
    {
        "type": "quiz",
        "title": "Attention Mechanism Core Query",
        "body": "Which component in the standard Transformer self-attention formula determines the scaling factor used to prevent extremely small gradients during softmax scaling?",
        "domain": "Fundamentals",
        "difficulty": "advanced",
        "options": [
            {"text": "The square root of the key dimension (sqrt(d_k))", "is_correct": True, "explanation": "Dividing Q*K^T by sqrt(d_k) stabilizes the dot product gradients, preventing extremely small values near zero after softmax scaling."},
            {"text": "The feed-forward hidden projection dimension", "is_correct": False, "explanation": "The feed-forward layer processes token embeddings independently and does not scale attention matrix scores."},
            {"text": "The number of attention heads", "is_correct": False, "explanation": "The number of heads controls attention diversification but does not scale individual query-key product distributions."}
        ]
    }
]

def _generate_daily_cards_via_groq():
    client = _get_groq_client()
    if not client:
        raise Exception("Groq API key not configured")
        
    prompt = """You are an expert AI/ML content creator. Generate exactly 6 cards for a daily challenge:
3 'concept' cards, 2 'news' cards, and 1 'quiz' card.

Respond ONLY with a valid JSON array of 6 objects. Do not wrap in markdown tags like ```json.
Each object must match this schema:
For concept/news:
{
  "type": "concept" | "news",
  "title": "Short title",
  "body": "Detailed content (1-2 paragraphs)",
  "tldr": "1 sentence summary",
  "domain": "NLP" | "CV" | "RL" | "Fundamentals" | "Agents",
  "difficulty": "beginner" | "intermediate" | "advanced"
}

For quiz:
{
  "type": "quiz",
  "title": "Question title",
  "body": "Question context or text",
  "domain": "NLP" | "CV" | "RL" | "Fundamentals" | "Agents",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "options": [
    {"text": "Option A", "is_correct": true, "explanation": "Why this is correct"},
    {"text": "Option B", "is_correct": false, "explanation": "Why this is wrong"},
    {"text": "Option C", "is_correct": false, "explanation": "Why this is wrong"}
  ]
}
"""
    completion = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.3-70b-versatile",
        temperature=0.7,
        max_tokens=2500
    )
    
    response_text = completion.choices[0].message.content.strip()
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]
        
    return json.loads(response_text)


@router.get("/today")
def get_today_challenge(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    today = date.today()
    user = _get_or_create_user(current_user, db)
    user_uuid = user.id
    
    challenge = db.query(DailyChallenge).filter(DailyChallenge.date == today).first()
    
    if not challenge:
        # Generate new cards
        try:
            generated_cards_data = _generate_daily_cards_via_groq()
        except Exception as e:
            print(f"Failed to generate daily challenge via Groq: {e}. Using high-quality local fallback.")
            generated_cards_data = MOCK_DAILY_CARDS

            
        try:
            card_ids = []
            for data in generated_cards_data:
                c = Card(
                    type=data["type"],
                    title=data["title"],
                    body=data["body"],
                    tldr=data.get("tldr", ""),
                    domain=data.get("domain", "Fundamentals"),
                    difficulty=data.get("difficulty", "beginner"),
                    is_approved=True
                )
                db.add(c)
                db.flush()
                card_ids.append(c.id)
                
                if data["type"] == "quiz" and "options" in data:
                    for opt in data["options"]:
                        q_opt = QuizOption(
                            card_id=c.id,
                            option_text=opt["text"],
                            is_correct=opt["is_correct"],
                            explanation=opt.get("explanation", "")
                        )
                        db.add(q_opt)
            
            challenge = DailyChallenge(date=today, card_ids=card_ids)
            db.add(challenge)
            db.commit()
            db.refresh(challenge)
        except Exception:
            db.rollback()
            raise
        
    # Check if user has already completed it
    completion = db.query(DailyChallengeCompletion).filter(
        DailyChallengeCompletion.user_id == user_uuid,
        DailyChallengeCompletion.challenge_date == today
    ).first()
    
    all_options = db.query(QuizOption).filter(QuizOption.card_id.in_(challenge.card_ids)).all()
    options_by_card = {}
    for o in all_options:
        options_by_card.setdefault(str(o.card_id), []).append(o)

    # Fetch all cards at once to optimize performance (fixes N+1 queries)
    challenge_cards = db.query(Card).filter(Card.id.in_(challenge.card_ids)).all()
    # Map by ID for easy lookup
    cards_by_id = {c.id: c for c in challenge_cards}
    
    # Query user completion status for these daily challenge cards
    all_statuses = db.query(UserCardStatus).filter(
        UserCardStatus.user_id == user_uuid,
        UserCardStatus.card_id.in_(challenge.card_ids)
    ).all()
    status_by_card = {s.card_id: s.status for s in all_statuses}

    cards = []
    for cid in challenge.card_ids:
        # PostgreSQL UUID can be mapped safely
        c = cards_by_id.get(cid)
        if c:
            card_data = {
                "id": str(c.id),
                "type": c.type,
                "title": c.title,
                "hook_line": c.hook_line,
                "why_it_matters": c.why_it_matters,
                "body": c.body,
                "tldr": c.tldr,
                "domain": c.domain,
                "difficulty": c.difficulty,
                "upvotes": c.upvotes,
                "status": status_by_card.get(c.id, "unseen")
            }
            if c.type == 'quiz':
                options = options_by_card.get(str(c.id), [])
                card_data["options"] = [{"id": str(o.id), "text": o.option_text} for o in options]
            cards.append(card_data)
            
    return {
        "date": str(today),
        "is_completed": completion is not None,
        "cards": cards
    }

@router.post("/complete")
def complete_today_challenge(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    today = date.today()
    user_uuid = uuid_lib.UUID(str(current_user.id))
    
    # 1. Acquire write lock on user row to prevent race conditions, duplicate claims, and reward abuse
    user = db.query(User).filter(User.id == user_uuid).with_for_update().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 2. Check if already completed today
    completion = db.query(DailyChallengeCompletion).filter(
        DailyChallengeCompletion.user_id == user_uuid,
        DailyChallengeCompletion.challenge_date == today
    ).first()
    
    if completion:
        raise HTTPException(status_code=400, detail="Challenge already completed today")
        
    challenge = db.query(DailyChallenge).filter(DailyChallenge.date == today).first()
    if not challenge or not challenge.card_ids:
        raise HTTPException(status_code=404, detail="Daily challenge not found for today")
        
    # 3. Check if the user has completed ALL cards in the daily challenge
    completed_count = db.query(UserCardStatus).filter(
        UserCardStatus.user_id == user_uuid,
        UserCardStatus.card_id.in_(challenge.card_ids),
        UserCardStatus.status == "completed"
    ).distinct(UserCardStatus.card_id).count()
    
    total_required = len(challenge.card_ids)
    if completed_count < total_required:
        raise HTTPException(
            status_code=400, 
            detail=f"You must complete every assigned card before claiming rewards. Completed: {completed_count}/{total_required}."
        )

    try:
        # Base XP is 100 for daily challenge completion
        xp_earned = 100
        new_comp = DailyChallengeCompletion(
            user_id=user_uuid,
            challenge_id=challenge.id,
            challenge_date=today,
            xp_earned=xp_earned
        )
        db.add(new_comp)
        
        # Award XP to user
        user.xp = (user.xp or 0) + xp_earned
        
        # Log XP transaction to ledger
        tx = UserXpTransaction(
            user_id=user_uuid,
            amount=xp_earned,
            reason="daily_challenge",
            reference_id=challenge.id
        )
        db.add(tx)
        
        # Log daily activity event
        from sqlalchemy.dialects.postgresql import insert as pg_insert
        act_stmt = pg_insert(UserActivityEvent).values(
            user_id=user_uuid,
            activity_date=today,
            activity_type="claim_daily"
        ).on_conflict_do_nothing()
        db.execute(act_stmt)
    
        # Handle streak logic
        from datetime import timedelta
        last_activity = user.last_active_date
        if last_activity is None or last_activity < today:
            if last_activity == today - timedelta(days=1):
                user.streak_days = (user.streak_days or 0) + 1
            elif last_activity is None or last_activity < today - timedelta(days=1):
                user.streak_days = 1
            
            user.last_active_date = today
    
        _update_weekly_leaderboard(db, user_uuid, xp_earned, None)
        
        db.commit()
    except Exception:
        db.rollback()
        raise
    
    return {"success": True, "xp_earned": xp_earned, "streak_days": user.streak_days}

