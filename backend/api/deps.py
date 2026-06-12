from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os
from upstash_redis import Redis

# Using HTTPBearer to extract the Authorization token from the request
security = HTTPBearer()

# Initialize Upstash Redis client
redis_url = os.getenv("UPSTASH_REDIS_URL")
redis_token = os.getenv("UPSTASH_REDIS_TOKEN")

redis_client = None
if redis_url and redis_token:
    try:
        redis_client = Redis(url=redis_url, token=redis_token)
    except Exception as e:
        print(f"[redis] Failed to initialize Redis in deps.py: {e}")


class LocalSupabaseUser:
    """
    Mock class representing the Supabase User returned after local JWT verification.
    Matches the schema expected by the application: .id, .email, and .user_metadata.
    """
    def __init__(self, id: str, email: str, user_metadata: dict = None):
        self.id = id
        self.email = email
        self.user_metadata = user_metadata or {}


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Validates the Supabase JWT.
    First attempts offline local verification using the HS256 algorithm and SUPABASE_JWT_SECRET.
    Strictly validates signature, expiration (exp), audience (aud), issuer (iss), and role claims.
    Falls back to external Supabase auth server get_user call if local secret is not set or fails.
    """
    token = credentials.credentials
    jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
    supabase_url = os.getenv("SUPABASE_URL")
    
    expected_iss = f"{supabase_url}/auth/v1" if supabase_url else None

    if jwt_secret:
        try:
            # Local JWT decoding with strict claims verification (PyJWT automatically verifies exp)
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_iss": True} if expected_iss else {"verify_iss": False},
                issuer=expected_iss
            )

            # Strict backend-enforced validation of claims (never trust frontend claims)
            role = payload.get("role")
            if role != "authenticated":
                raise jwt.InvalidTokenError("Invalid role claim: unauthorized access.")

            user_id = payload.get("sub")
            email = payload.get("email")
            user_metadata = payload.get("user_metadata", {})

            if not user_id:
                raise jwt.InvalidTokenError("Missing subject (user ID) in token claims.")

            return LocalSupabaseUser(id=user_id, email=email, user_metadata=user_metadata)
            
        except jwt.ExpiredSignatureError as e:
            # Token is explicitly expired. Do not fallback, raise immediate unauthorized error
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token has expired. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except Exception as e:
            # Signature mismatch, issuer/audience mismatch, or parsing error.
            # Log violation and fallback safely to Supabase API to remain robust.
            print(f"[auth] Local HS256 verification failed/bypassed: {e}. Falling back to Supabase client API.")

    # Safe fallback with high-performance caching via Redis to eliminate latency bottleneck
    import hashlib
    import json
    
    token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
    redis_key = f"auth_cache:{token_hash}"
    
    if redis_client:
        try:
            cached_val = redis_client.get(redis_key)
            if cached_val:
                user_dict = json.loads(cached_val)
                return LocalSupabaseUser(
                    id=user_dict["id"], 
                    email=user_dict["email"], 
                    user_metadata=user_dict.get("user_metadata", {})
                )
        except Exception as re:
            print(f"[auth_cache] Failed to fetch from Redis: {re}")

    from supabase import create_client, Client
    
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not supabase_url or not key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase environment configuration is incomplete."
        )
    
    try:
        supabase: Client = create_client(supabase_url, key)
        user_response = supabase.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials.",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        user = user_response.user
        
        # Cache successfully verified user in Redis for 5 minutes (300 seconds)
        if redis_client and user:
            try:
                redis_client.set(
                    redis_key,
                    json.dumps({
                        "id": str(user.id),
                        "email": user.email,
                        "user_metadata": getattr(user, "user_metadata", {}) or {}
                    }),
                    ex=300
                )
            except Exception as se:
                print(f"[auth_cache] Failed to set cache in Redis: {se}")
                
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def check_rate_limit(key_prefix: str, limit: int, window_seconds: int, identifier: str):
    """
    Enforces a fixed-window rate limit utilizing Upstash Redis.
    Features:
      - Exponential lockout cooldown escalation on consecutive violations.
      - Temporary soft lockouts (e.g. base 30s * 2^violations).
      - Strict abuse logging for security transparency.
    """
    if not redis_client:
        return True # Fallback to allow request if Redis is down/absent in dev

    lockout_key = f"lockout:{key_prefix}:{identifier}"
    violation_key = f"violations:{key_prefix}:{identifier}"
    rate_key = f"rate_limit:{key_prefix}:{identifier}"

    try:
        # 1. Check if user is currently soft locked out
        remaining_lockout = redis_client.ttl(lockout_key)
        if remaining_lockout > 0:
            print(f"[abuse_logging] BLOCKING locked out request from {identifier} on endpoint '{key_prefix}'. Cooldown remaining: {remaining_lockout}s.")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many rate violations. Temporary soft lockout active. Try again in {remaining_lockout} seconds."
            )

        # 2. Check current rate limits in active window
        current = redis_client.incr(rate_key)
        if current == 1:
            redis_client.expire(rate_key, window_seconds)

        if current > limit:
            # Increment violation count (violations persist for 1 hour to penalize repeated spammers)
            violations = redis_client.incr(violation_key)
            if violations == 1:
                redis_client.expire(violation_key, 3600)

            # Calculate exponential soft lockout: 30 seconds base * 2^(violations - 1)
            base_lockout = 30
            lockout_duration = base_lockout * (2 ** (violations - 1))
            
            # Apply temporary soft lockout key
            redis_client.set(lockout_key, "1", ex=lockout_duration)

            print(f"[abuse_logging] RATE LIMIT VIOLATION by {identifier} on endpoint '{key_prefix}'. Total violations: {violations}. Applying lockout for {lockout_duration}s.")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Temporary soft lockout applied for {lockout_duration} seconds."
            )

    except HTTPException:
        raise
    except Exception as e:
        # Fail open in production for resilience if Redis hits a connection issue, but log the error
        print(f"[rate_limiter] Upstash Redis execution error: {e}")
        return True
