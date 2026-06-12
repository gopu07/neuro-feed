-- Run this migration manually: psql $DATABASE_URL < this_file.sql
-- Or via Supabase dashboard: SQL Editor → paste contents

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE UNIQUE NOT NULL,
  card_ids TEXT[] DEFAULT '{}',
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_challenge_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES daily_challenges(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  xp_earned INTEGER DEFAULT 0
);
