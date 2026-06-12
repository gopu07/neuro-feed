-- NeuroFeed Core Database Rebuild and Additive Migration
-- Date: 2026-05-29

-- 1. Create XP Transactions Audit Ledger Table
CREATE TABLE IF NOT EXISTS user_xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason VARCHAR(50) NOT NULL, -- 'save', 'unsave', 'quiz_correct', 'daily_challenge', 'spaced_rep_review', 'legacy_migration'
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for fast user history lookup and analytics aggregation
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_created ON user_xp_transactions(user_id, created_at);

-- 2. Create User Activity Events Table (Timezone-safe calendar)
CREATE TABLE IF NOT EXISTS user_activity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    activity_type VARCHAR(50) NOT NULL, -- 'read_card', 'submit_quiz', 'claim_daily'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_activity_day UNIQUE (user_id, activity_date, activity_type)
);

-- Index for streak calculations and daily engagement lookups
CREATE INDEX IF NOT EXISTS idx_activity_events_user_date ON user_activity_events(user_id, activity_date);

-- 3. Create Daily Challenge Cards Junction Table
CREATE TABLE IF NOT EXISTS daily_challenge_cards (
    challenge_id UUID NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    PRIMARY KEY (challenge_id, card_id)
);

-- 4. Create Review History Table (Spaced repetition audit log)
CREATE TABLE IF NOT EXISTS review_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,
    ease_factor FLOAT NOT NULL,
    interval_days INTEGER NOT NULL,
    repetitions INTEGER NOT NULL,
    review_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_review_history_user_card ON review_history(user_id, card_id);

-- 5. Create User Feed Interactions Table
CREATE TABLE IF NOT EXISTS user_feed_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'view', 'skip', 'dwell'
    dwell_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_feed_interactions_user_card ON user_feed_interactions(user_id, card_id);

-- =========================================================================
-- 6. Backfilling Legacy Data
-- =========================================================================

-- Backfill User XP into transactions ledger as 'legacy_migration'
INSERT INTO user_xp_transactions (user_id, amount, reason, reference_id, created_at)
SELECT id, xp, 'legacy_migration', NULL, created_at
FROM users
WHERE xp > 0
ON CONFLICT DO NOTHING;

-- Backfill Daily Challenge arrays into daily_challenge_cards junction table
-- Using PostgreSQL unnest to expand challenge.card_ids array, filtering out dangling references
INSERT INTO daily_challenge_cards (challenge_id, card_id)
SELECT dc.id, c.id
FROM (
    SELECT id, unnest(card_ids)::UUID AS card_id
    FROM daily_challenges
) dc
JOIN cards c ON dc.card_id = c.id
ON CONFLICT DO NOTHING;
