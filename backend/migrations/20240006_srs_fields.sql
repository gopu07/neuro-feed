-- Run this migration manually: psql $DATABASE_URL < this_file.sql

ALTER TABLE user_card_status ADD COLUMN IF NOT EXISTS ease_factor FLOAT DEFAULT 2.5;
ALTER TABLE user_card_status ADD COLUMN IF NOT EXISTS interval_days INTEGER DEFAULT 1;
ALTER TABLE user_card_status ADD COLUMN IF NOT EXISTS repetitions INTEGER DEFAULT 0;
ALTER TABLE user_card_status ADD COLUMN IF NOT EXISTS next_review_date DATE;
