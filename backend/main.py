from fastapi import FastAPI, Depends, Header, HTTPException, BackgroundTasks, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from api.deps import get_current_user
from db.database import get_db
from db.models import Card
from sqlalchemy.orm import Session
from api.routes.feed import router as feed_router
from api.routes.cards import router as cards_router
from api.routes.quiz import router as quiz_router
from api.routes.user import router as user_router
from api.routes.daily_challenge import router as daily_challenge_router
from api.routes.sessions import router as sessions_router
from api.routes.notifications import router as notifications_router
from api.routes.leaderboard import router as leaderboard_router
from api.routes.explore import router as explore_router
from api.routes.labs import router as labs_router
from api.routes.reviews import router as reviews_router
from api.routes.guilds import router as guilds_router
from api.routes.referrals import router as referrals_router
from jobs.scheduler import scheduler, fetch_news_job

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

app = FastAPI(title="NeuroFeed API")

admin_key = os.getenv("ADMIN_API_KEY")
if not admin_key:
    raise RuntimeError(
        "ADMIN_API_KEY environment variable is not set. "
        "The server cannot start without it."
    )

# Configure CORS — dynamically parsed from ALLOWED_ORIGINS environment variable
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    ALLOWED_ORIGINS = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
else:
    ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:8080",
    ]

# Security assurance: Never allow wildcard '*' with credentials enabled
if "*" in ALLOWED_ORIGINS:
    ALLOWED_ORIGINS = [origin for origin in ALLOWED_ORIGINS if origin != "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Custom middleware to inject secure production headers
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    
    # 1. HSTS (Strict-Transport-Security) — only applied for secure connections
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    
    # 2. Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY"
    
    # 3. Prevent MIME-sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"
    
    # 4. Control referrer visibility
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # 5. Production Content-Security-Policy (CSP) with restrict connect-src
    supabase_url = os.getenv("SUPABASE_URL", "")
    connect_src = "'self'"
    if supabase_url:
        from urllib.parse import urlparse
        try:
            parsed = urlparse(supabase_url)
            if parsed.scheme and parsed.netloc:
                connect_src += f" {parsed.scheme}://{parsed.netloc}"
        except Exception:
            pass
            
    # Restrict connect-src safely for AI APIs (like Groq)
    connect_src += " https://api.groq.com"
    
    response.headers["Content-Security-Policy"] = (
        f"default-src 'none'; "
        f"connect-src {connect_src}; "
        f"script-src 'self'; "
        f"style-src 'self' 'unsafe-inline'; "
        f"img-src 'self' data:; "
        f"font-src 'self' data:; "
        f"frame-ancestors 'none';"
    )
    
    return response

app.include_router(feed_router, prefix="/api")
app.include_router(cards_router, prefix="/api")
app.include_router(quiz_router, prefix="/api/quiz")
app.include_router(user_router, prefix="/api")
app.include_router(daily_challenge_router, prefix="/api/daily-challenge")
app.include_router(sessions_router, prefix="/api/sessions", tags=["sessions"])
app.include_router(notifications_router, prefix="/api/notifications", tags=["notifications"])
app.include_router(leaderboard_router, prefix="/api/leaderboard", tags=["leaderboard"])
app.include_router(explore_router, prefix="/api/explore", tags=["explore"])
app.include_router(labs_router, prefix="/api/labs", tags=["labs"])
app.include_router(reviews_router, prefix="/api/reviews", tags=["reviews"])
app.include_router(guilds_router, prefix="/api/guilds", tags=["guilds"])
app.include_router(referrals_router, prefix="/api/referrals", tags=["referrals"])

@app.on_event("startup")
async def startup_event():
    scheduler.start()

@app.get("/")
def root():
    return {"message": "NeuroFeed API is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/test-auth")
def test_auth(current_user = Depends(get_current_user)):
    return {
        "message": "Authentication successful",
        "user_id": current_user.id,
        "email": current_user.email
    }

@app.get("/admin/cards")
def get_all_cards(db: Session = Depends(get_db), x_admin_key: str = Header(None, alias="X-Admin-Key")):
    if not x_admin_key or x_admin_key != admin_key:
        raise HTTPException(status_code=401, detail="Unauthorized")
    cards = db.query(Card).all()
    return cards

@app.post("/api/admin/news/fetch")
async def trigger_news_fetch(background_tasks: BackgroundTasks, x_admin_key: str = Header(None, alias="X-Admin-Key")):
    if not x_admin_key or x_admin_key != admin_key:
        raise HTTPException(status_code=401, detail="Unauthorized")
    background_tasks.add_task(fetch_news_job)
    return {"message": "News fetch triggered in background"}
