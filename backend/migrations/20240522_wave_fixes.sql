-- DB-001 / DB-002: Add missing columns
ALTER TABLE daily_challenges ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE daily_challenges ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'pending';

ALTER TABLE daily_challenge_completions ADD COLUMN IF NOT EXISTS challenge_id UUID REFERENCES daily_challenges(id) ON DELETE CASCADE;

-- DB-018: Unique constraint for upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_interactions_unique ON user_interactions(user_id, card_id, action);

-- DB-019: Unique constraint for upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_user_week ON leaderboard_weekly(user_id, week_start, domain);

-- Wave 7: Performance indexes
CREATE INDEX IF NOT EXISTS idx_cards_approved_type ON cards(is_approved, type);
CREATE INDEX IF NOT EXISTS idx_cards_domain_diff ON cards(domain, difficulty);
CREATE INDEX IF NOT EXISTS idx_user_card_status_status ON user_card_status(status);
CREATE INDEX IF NOT EXISTS idx_user_card_status_next_review ON user_card_status(next_review_date);
