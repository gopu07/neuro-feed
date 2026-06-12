-- Run this migration manually: psql $DATABASE_URL < this_file.sql
-- Or via Supabase dashboard: SQL Editor → paste contents

ALTER TABLE cards 
  ADD COLUMN IF NOT EXISTS hook_line VARCHAR(200),
  ADD COLUMN IF NOT EXISTS why_it_matters TEXT;

ALTER TABLE user_card_status
  ADD COLUMN IF NOT EXISTS ease_factor FLOAT DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS interval_days INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS repetitions INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_review_date DATE;
