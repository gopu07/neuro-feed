from sqlalchemy import Column, String, Integer, Boolean, Text, Date, DateTime, ForeignKey, ARRAY, Float
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.sql import func
from .database import Base
import uuid

# Define Enums explicitly for SQLAlchemy mapping
skill_level_enum = ENUM('beginner', 'intermediate', 'advanced', name='skill_level_enum', create_type=False)
card_type_enum = ENUM('concept', 'news', 'quiz', name='card_type_enum', create_type=False)
card_comment_type_enum = ENUM('fun_fact', 'exercise', 'discussion', 'news_link', name='card_comment_type_enum', create_type=False)
user_interaction_action_enum = ENUM('view', 'upvote', 'save', 'skip', 'share', name='user_interaction_action_enum', create_type=False)
user_card_status_enum = ENUM('unseen', 'seen', 'completed', 'saved', name='user_card_status_enum', create_type=False)
class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    username = Column(String)
    skill_level = Column(skill_level_enum, default='beginner')
    domains = Column(ARRAY(String), default=[])
    xp = Column(Integer, default=0)
    streak_days = Column(Integer, default=0)
    last_active_date = Column(Date)
    streak_shield = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Card(Base):
    __tablename__ = "cards"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(card_type_enum, nullable=False)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    tldr = Column(String)
    domain = Column(String, nullable=False)
    difficulty = Column(skill_level_enum, nullable=False)
    hook_line = Column(String(200), nullable=True)
    why_it_matters = Column(Text, nullable=True)
    upvotes = Column(Integer, default=0)
    source_url = Column(String)
    related_card_ids = Column(ARRAY(UUID(as_uuid=True)), default=[])
    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CardComment(Base):
    __tablename__ = "card_comments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    card_id = Column(UUID(as_uuid=True), ForeignKey("cards.id", ondelete="CASCADE"))
    type = Column(card_comment_type_enum, nullable=False)
    content = Column(Text, nullable=False)
    upvotes = Column(Integer, default=0)
    is_ai_generated = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserInteraction(Base):
    __tablename__ = "user_interactions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    card_id = Column(UUID(as_uuid=True), ForeignKey("cards.id", ondelete="CASCADE"))
    action = Column(user_interaction_action_enum, nullable=False)
    dwell_seconds = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserCardStatus(Base):
    __tablename__ = "user_card_status"
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    card_id = Column(UUID(as_uuid=True), ForeignKey("cards.id", ondelete="CASCADE"), primary_key=True)
    status = Column(user_card_status_enum, default='unseen')
    ease_factor = Column(Float, default=2.5)
    interval_days = Column(Integer, default=1)
    repetitions = Column(Integer, default=0)
    next_review_date = Column(Date)

class QuizOption(Base):
    __tablename__ = "quiz_options"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    card_id = Column(UUID(as_uuid=True), ForeignKey("cards.id", ondelete="CASCADE"))
    option_text = Column(String, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    explanation = Column(Text)

class UserQuizAttempt(Base):
    __tablename__ = "user_quiz_attempts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    card_id = Column(UUID(as_uuid=True), ForeignKey("cards.id", ondelete="CASCADE"))
    selected_option_id = Column(UUID(as_uuid=True), ForeignKey("quiz_options.id", ondelete="CASCADE"))
    is_correct = Column(Boolean, nullable=False)
    xp_earned = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class LeaderboardWeekly(Base):
    __tablename__ = "leaderboard_weekly"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    week_start = Column(Date, nullable=False)
    domain = Column(String)
    xp_this_week = Column(Integer, default=0)

class DailyChallenge(Base):
    __tablename__ = "daily_challenges"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    date = Column(Date, unique=True, nullable=False)
    card_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=False)
    status = Column(String, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class DailyChallengeCompletion(Base):
    __tablename__ = "daily_challenge_completions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    challenge_id = Column(UUID(as_uuid=True), ForeignKey("daily_challenges.id", ondelete="CASCADE"), nullable=True)
    challenge_date = Column(Date, nullable=False)
    completed_at = Column(DateTime(timezone=True), server_default=func.now())
    xp_earned = Column(Integer, default=0)

class LearningSession(Base):
    __tablename__ = "learning_sessions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    cards_reviewed = Column(Integer, default=0)
    xp_earned = Column(Integer, default=0)

class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    endpoint = Column(String, nullable=False)
    p256dh = Column(String, nullable=False)
    auth = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class UserXpTransaction(Base):
    __tablename__ = "user_xp_transactions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Integer, nullable=False)
    reason = Column(String(50), nullable=False)
    reference_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserActivityEvent(Base):
    __tablename__ = "user_activity_events"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    activity_date = Column(Date, nullable=False)
    activity_type = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class DailyChallengeCard(Base):
    __tablename__ = "daily_challenge_cards"
    challenge_id = Column(UUID(as_uuid=True), ForeignKey("daily_challenges.id", ondelete="CASCADE"), primary_key=True)
    card_id = Column(UUID(as_uuid=True), ForeignKey("cards.id", ondelete="CASCADE"), primary_key=True)

class ReviewHistory(Base):
    __tablename__ = "review_history"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    card_id = Column(UUID(as_uuid=True), ForeignKey("cards.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False)
    ease_factor = Column(Float, nullable=False)
    interval_days = Column(Integer, nullable=False)
    repetitions = Column(Integer, nullable=False)
    review_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserFeedInteraction(Base):
    __tablename__ = "user_feed_interactions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    card_id = Column(UUID(as_uuid=True), ForeignKey("cards.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(50), nullable=False)
    dwell_seconds = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Guild(Base):
    __tablename__ = "guilds"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)
    xp = Column(Integer, default=0)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class GuildMember(Base):
    __tablename__ = "guild_members"
    guild_id = Column(UUID(as_uuid=True), ForeignKey("guilds.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, unique=True)
    role = Column(String, default="member")
    joined_at = Column(DateTime(timezone=True), server_default=func.now())


class GuildMessage(Base):
    __tablename__ = "guild_messages"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    guild_id = Column(UUID(as_uuid=True), ForeignKey("guilds.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    username = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Referral(Base):
    __tablename__ = "referrals"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    referrer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    referred_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, unique=True)
    referral_code = Column(String, nullable=False)
    status = Column(String, default="pending")
    xp_awarded = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)


